# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from setuptools import setup
from retorica import __version__


try:
    with open('README.rst') as readme:
        README = readme.read()
except IOError:
    README = ''


setup(
    name='retorica',
    version=__version__,
    packages=['retorica'],
    install_requires=['click', 'rpy2', 'pymongo', 'arrow', 'pyth'],
    author='Dirley Rodrigues',
    author_email='dirleyrls@gmail.com',
    long_description=README,
    license='MIT',
    scripts=['bin/retorica'],
)
