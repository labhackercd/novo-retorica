retorica
========

This is basically a set of scripts used to generate http://retorica.labhackercd.net.


System Requirements
-------------------

- [R](https://www.r-project.org/) >= 3.1

- [Python](https://www.python.org/) 2.7.x

- [MongoDB](https://www.mongodb.org/)


Required R Packages
-------------------

Once you have R installed, run it, get into the REPL and enter the following to install the required packages::

```
install.packages("tm")
install.packages("jsonlite")
install.packages("MCMCpack")
install.packages("SnowballC")
```


Installation
------------

Just `pip install` the project and make sure it completes successfully.


Obtaining the dataset
---------------------

Use the [raspador-legislativo](https://github.com/labhackercd/raspador-legislativo)
to scrape speech and congressman data. Please refer to their documentation
for instructions on how to do that.
