retorica
========


Obter os dados
--------------

Use o raspador-legislativo para pegar os dados dos discursos e dos deputados:

```
$ git clone https://github.com/labhackercd/raspador-legislativo.git
$ cd raspador-legislativo
$ pip install -r requirements.txt
$ scrapy crawl discursos
$ scrapy crawl deputados
```

Os dados dos discursos serão salvos no MongoDB. Os arquivos RTF contendo as transcrições dos discursos serão salvos em `./files`. Guarde esse caminho para depois.


Gerar os datasets
-----------------

Crie um diretório para guardar os dados.

```
$ mkdir data
$ cd data
```

Importe os dados do banco para um formato que o retorica entenda. O comando abaixo importa todos os discursos no período de 1/1/2015 a 12/12/2015 para o arquivo `2015.json`.

```
$ retorica import -d kingsnake -s 2015-01-01 -e 2015-12-12 -f /caminho/para/diretorio/files 2015.json
```

Processe os dados importados para gerar o arquivo `.rds`.

```
$ retorica process 2015.json 2015.rds
```

Ao lado do arquivo `.rds`, haverá também um arquivo `.rds.csv`. Abra-o com algum aplicativo de planilhas (Excel, LibreOffice) para visualizar as palavras de cada tópico. Por padrão, 70 tópicos serão gerados. Você pode mudar isso passando o parâmetro `-t` para o comando acima.

Crie um arquivo `.topics.txt` e coloque em cada linha o título que deseja atribuir a cada um dos tópicos observados no passo anterior. Tenha o cuidado para que cada linha contenha apenas um título, e que a ordem dos títulos seja a mesma da ordem dos tópicos no arquivo csv. Esse arquivo pode conter comentários e linhas vazias. Utilize as linhas vazias para indicar quais tópicos não devem ser incluídos no resultado final. Ex.:

```
Tópico 1
Tópico 2  # Comentário. Tudo que vier depois do caractere '#' será ignorado.
# Uma linha contendo apenas comentários e espaços em branco, como essa, indica que o tópico associado a ela não será incluído no resultado final.
Tópico 4

Tópico 6  # A linha vazia acima também serve para remover o 'tópico 5' do resultado.
```

Agora certifique-se de que os nomes dos arquivos estão corretos. O arquivo com os dados dos discursos importados deve seguir o padrão `[nome].json`, o `.rds` deve se chamar `[nome].rds`, e os arquivo com os rótulos dos tópicos deve se chamar `[nome].topics.txt`.

Repita o processo para todos os datasets que deseja exibir no site. Quando todos houverem sido processados e os rótulos estiverem corretamente preenchidos, gere o site.


Gerar o site
------------

```
$ retorica build 2016.rds 2015.rds 2014.rds
```

Esse comando gerará um diretório `./build` contendo o site. Os datasets aparecerão no menu na mesma ordem em que foram passados para o comando. O primeiro dataset passado será exibido na página `index.html` do site.
