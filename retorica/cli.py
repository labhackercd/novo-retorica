# -*- coding: utf-8 -*-
# XXX I mean, is it right to import
# unicode_literals everywhere else but here?
# Even this comment looks ugly.
import os
import json
from contextlib import closing
from operator import itemgetter
from functools import partial
from itertools import imap, groupby, ifilter

import arrow
import click
import jinja2 as jinja2
import numpy
import pymongo
import rpy2.robjects
import shutil

from retorica.utils import slugify_to_ascii, read_rtf_text


def fix_speech_start_time(speech):
    speech[u'horaInicioDiscurso'] = speech[u'horaInicioDiscurso']['$date']
    return speech


def strip_suffix(value, suffix):
    if value.endswith(suffix):
        value = value[:-len(suffix)]
    return value


def normalize_name(name):
    name = slugify_to_ascii(name)
    name = name.encode('utf-8')
    name = strip_suffix(name, u'-presidente')
    return name


def normalize_author_name(speech):
    v = speech.get(u'nomeOrador')
    if v is not None:
        v = normalize_name(v)
    speech[u'nomeOradorNormalizado'] = v
    return speech


def read_document(path):
    with open(path, 'rb') as fp:
        return read_rtf_text(fp, errors='replace')


def load_speech_content(item, path):
    files = item[u'files']
    files = imap(itemgetter(u'path'), files)
    files = imap(partial(os.path.join, path), files)
    files = imap(read_document, files)
    item[u'conteudo'] = u'\n\n\n\n'.join(files)
    del item[u'files']
    return item


class DateParamType(click.ParamType):
    name = 'date'

    def convert(self, value, param, ctx):
        try:
            if value == u'today':
                value = arrow.get().datetime
            else:
                return arrow.get(value).datetime
        except Exception as exc:
            self.fail(u'{0} cannot be parsed as a date: {1}'.format(value, exc.message), param, ctx)


def convert_dates_to_iso(item):
    item[u'horaInicioDiscurso'] = item[u'horaInicioDiscurso'].isoformat()
    return item


def make_database_connection(host, port, database):
    client = pymongo.MongoClient(host, port)
    return getattr(client, database)


def capfirst(s):
    if not s:
        return s
    return s[0].capitalize() + s[1:]


def rpy2_source_retorica():
    here = os.path.abspath(os.path.join(os.path.dirname(__file__)))
    retorica = os.path.join(here, 'retorica.R')
    rpy2.robjects.r('setwd("{0}")'.format(os.getcwd()))
    rpy2.robjects.r('source("{0}", chdir=TRUE)'.format(retorica))


def escape_double_quotes(s):
    return s.replace('"', '\\"')


def prepare_arg(arg):
    if isinstance(arg, basestring):
        arg = u'"{0}"'.format(escape_double_quotes(arg))
    else:
        arg = repr(arg)
    return arg


def call_r_method_with_string_arguments(method, *args):
    args = map(prepare_arg, args)
    args = ', '.join(args)
    return rpy2.robjects.r('{0}({1})'.format(method, args))


@click.group()
def main():
    pass


def as_name_ide_tuple(item):
    nome = item.get(u'nome')
    if nome is not None:
        nome = normalize_name(nome)
    return nome, item.get(u'ide_cadastro')


def update_with(d1, d2):
    d3 = {}
    d3.update(d1)
    d3.update(d2)
    return d3


@main.command('import')
@click.option('-H', '--host', type=click.STRING, default=u'localhost')
@click.option('-P', '--port', type=click.INT, default=27017)
@click.option('-d', '--database', type=click.STRING, default=u'kingsnake')
@click.option('-s', '--start', type=DateParamType())
@click.option('-e', '--end', type=DateParamType())
# TODO should be an argument!!!! maybe we should just point to the kingsnake
# project and let people setup their connections there? that would be fking awesome!
@click.option('-f', '--files', type=click.Path(exists=True, file_okay=False),
              required=True, help=u'Where the files are stored.')
@click.argument('output', type=click.File(mode='w'))
def import_corpus(host, port, database, start, end, files, output):
    database = make_database_connection(host, port, database)

    if start:
        start = {u'horaInicioDiscurso': {u'$gt': start}}
    if end:
        end = {u'horaInicioDiscurso': {u'$lt': end}}

    if start and end:
        lookup = {u'$and': [start, end]}
    else:
        lookup = start or end or {}

    speeches = database.discursos.find(lookup)

    if not speeches.count():
        click.echo(u'No speech found')
        return 0

    # Ignorar discursos que não foram feitos por parlamentares
    speeches = [s for s in speeches if s[u'partidoOrador']]

    # Save this for later :D
    number_of_speeches = len(speeches)

    speeches = imap(normalize_author_name, speeches)

    deputados = database.deputados.find({u'nome_normalizado': None})
    number_of_deptuados = deputados.count()

    # remover _id
    deputados = imap(lambda i: i.pop(u'_id', None) and None or i, deputados)

    deputados_por_nome = dict()
    with click.progressbar(deputados, length=number_of_deptuados,
                           show_pos=True, label=u'Normalizing congressman names...') as deputados:
        for d in deputados:
            d[u'nome_normalizado'] = normalize_name(d[u'nome'])
            if d[u'nome_normalizado'] in deputados_por_nome:
                print(u'WARNING: Deputado repetido: {0} == {1}'.format(d, deputados_por_nome[d[u'nome_normalizado']]))
            deputados_por_nome[d[u'nome_normalizado']] = d

    speech_name_getter = itemgetter(u'nomeOradorNormalizado')

    # Filtrar os discursos, mantendo somente aqueles feitos por deputados presentes em `deputados_por_nome`
    speeches = ifilter(lambda s: speech_name_getter(s) in deputados_por_nome, speeches)

    with click.progressbar(speeches, length=number_of_speeches,
                           show_pos=True, label=u'Normalizing author names...') as speeches:

        speeches = sorted(speeches, key=speech_name_getter)
        valid_speeches = []

        for nome_orador, chunk in groupby(speeches, key=speech_name_getter):
            deputado = deputados_por_nome.get(nome_orador)
            if deputado is not None:
                chunk = list(chunk)
                if len(chunk) >= 2:
                    chunk = map(partial(update_with, deputado), chunk)
                    valid_speeches.extend(chunk)

        speeches = valid_speeches
        number_of_speeches = len(speeches)

    speeches = imap(convert_dates_to_iso, speeches)
    speeches = imap(partial(load_speech_content, path=files), speeches)

    # Strip object ids, which are not serializable by default
    speeches = imap(lambda i: i.pop(u'_id', None) and None or i, speeches)

    with click.progressbar(speeches, length=number_of_speeches,
                           show_pos=True, label=u'Extracting speech text...') as speeches:
        speeches = list(speeches)

        with closing(output) as fp:
            json.dump(speeches, fp, indent=2)


@main.command('process')
@click.option('-t', '--topics', type=click.INT, default=70, help=u'How many topics will be generated.')
@click.argument('corpus', type=click.Path(exists=True, dir_okay=False))
@click.argument('target', type=click.Path(dir_okay=False))
def process_corpus(corpus, target, topics):
    args = map(os.path.abspath, [corpus, target])
    args.append(topics)
    rpy2_source_retorica()
    call_r_method_with_string_arguments('processCorpus', *args)


def basename(path):
    return os.path.splitext(path)[0]


def open_p(path, *args, **kwargs):
    dn = os.path.dirname(path)
    if not os.path.exists(dn):
        os.makedirs(dn)
    return open(path, *args, **kwargs)


def as_rds_topics_tuple(path):
    base = basename(path)
    title = os.path.basename(base)
    return (title, (base + u'.json', path, base + u'.topics.txt'))


def _convert_str_vector(obj):
    arr = numpy.asarray(obj, dtype=object)
    mask = arr == rpy2.robjects.NA_Character
    if mask.any():
        arr[mask] = numpy.nan
    return arr


@main.command('build')
@click.option('-o', '--output', type=click.Path(exists=False, file_okay=False), default='./build')
@click.argument('rds-file', type=click.Path(exists=True, dir_okay=False), nargs=-1)
def compile_results(rds_file, output):
    rpy2_source_retorica()

    items = []
    inputs = imap(as_rds_topics_tuple, rds_file)
    outpath = lambda *x: os.path.abspath(os.path.join(output, *x))
    for title, args in inputs:
        url = u'{0}.html'.format(title)
        rel = u'data/{0}.json'.format(title)
        dest = outpath(rel)
        items.append(dict(title=title, url=url, data_url=rel, dest=dest, args=args))

    # First item should always be index.html
    if not items:
        raise RuntimeError(u'Especifique pelo menos um arquivo de entrada')
    else:
        items[0]['url'] = u'index.html'

    src = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))

    shutil.copytree(src, output)

    env = jinja2.Environment(loader=jinja2.PackageLoader('retorica', 'templates'))

    for i in items:
        ctx = {}
        ctx.update(i)
        ctx['items'] = filter(lambda x: x is not i, items)

        rout = call_r_method_with_string_arguments('tagResults', *i['args'])
        rout = _convert_str_vector(rout)[0].encode('utf-8')
        with open_p(outpath(i['dest']), 'w') as out:
            out.write(rout)

        with open_p(outpath(i['url']), 'w') as out:
            out.write(env.get_template('page.html').render(**ctx).encode('utf-8'))
