# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unicodedata

import pyth
import re
from pyth.plugins.plaintext.writer import PlaintextWriter
from pyth.plugins.rtf15 import reader


class CustomGroup(reader.Group):
    def handle_row(self):
        self.content.append(u'\n')

    def handle_cell(self):
        self.content.append(u' | ')


class CustomRtf15Reader(reader.Rtf15Reader):
    @classmethod
    def read(cls, source, errors='strict', clean_paragraphs=True):
        """
        source: A list of P objects.
        """

        reader = cls(source, errors, clean_paragraphs)
        return reader.go()

    def go(self):
        self.source.seek(0)

        if self.source.read(5) != r"{\rtf":
            from pyth.errors import WrongFileType
            raise WrongFileType("Doesn't look like an RTF file")

        self.source.seek(0)

        self.charsetTable = None
        self.charset = 'cp1252'
        self.group = CustomGroup(self)
        self.stack = [self.group]
        self.parse()
        return self.build()

    def parse(self):
        while True:
            next = self.source.read(1)

            if not next:
                break

            if next in '\r\n':
                continue
            if next == '{':
                subGroup = CustomGroup(self, self.group, self.charsetTable)
                self.stack.append(subGroup)
                subGroup.skip = self.group.skip
                self.group = subGroup
            elif next == '}':
                subGroup = self.stack.pop()
                self.group = self.stack[-1]
                subGroup.finalize()

                if subGroup.specialMeaning == 'FONT_TABLE':
                    self.charsetTable = subGroup.charsetTable
                self.group.content.append(subGroup)

            elif self.group.skip:
                # Avoid crashing on stuff we can't handle
                # inside groups we don't care about anyway
                continue

            elif next == '\\':
                control, digits = self.getControl()
                self.group.handle(control, digits)
            else:
                self.group.char(next)


def paragraph_is_text_like(p):
    """Should return `True` if the given `pyth.document.Paragraph` can be
    converted to text by the PlaintextWriter, `False` otherwise.
    ...But currently only returns `False` for images.
    """
    return not isinstance(p, pyth.document.Image)


def read_rtf_text(fp, errors='strict', encoding='utf-8'):
    doc = CustomRtf15Reader.read(fp, errors=errors)

    for p in doc.content:
        p.content = filter(paragraph_is_text_like, p.content)

    return PlaintextWriter.write(doc).read().decode(encoding)


def read_and_stem_rtf_file(rtf_file):
    text = read_rtf_text(rtf_file)
    text = slugify_to_ascii(text)
    text = text.strip()
    # Reduce words to their stemmed version
    #stemmer = nltk.stem.snowball.PortugueseStemmer()
    #return ' '.join(itertools.imap(stemmer.stem, clean.split()))
    return text


def slugify_to_ascii(v, fill='-'):
    v = unicodedata.normalize('NFKD', v).encode('ascii', 'ignore').decode('ascii')
    v = re.sub(r'[^\w\s-]', '', v).strip().lower()
    v = re.sub(r'[-\s]+', fill, v)
    return v
