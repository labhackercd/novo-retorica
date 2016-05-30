library(tm)
library(SnowballC)
library(jsonlite)

source("ExpAgendVMVA.R")

transliterate <- function(x) {
    iconv(x, "utf-8", "ASCII//TRANSLIT")
}

stemDocumentPortuguese <- function(x) {
    words <- unlist(strsplit(x, " "))
    words <- words[words != ""]
    words <- wordStem(words, language="portuguese")
    PlainTextDocument(paste(words))
}

asAuthorMatrix <- function(x) {
    x <- table(x)
    authors <- matrix(NA, nrow=length(x), ncol=2)
    for (i in 1:length(x)) {
        authors[i,] <- c(i, i + x[[i]])
    }
    authors
}

exportResult <- function(table, n=100, nsmall=3) {
    df <- as.data.frame(table)
    n <- min(n, nrow(df))
    rs <- matrix(nrow=ncol(df), ncol=n)
    for (t in 1:ncol(df)) {
        sorted <- head(df[order(df[,t], decreasing=T),][t], n=n)
        for (v in 1:nrow(sorted)) {
            z <- sorted[v,]
            z <- format(round(z, nsmall), nsmall=nsmall)
            rs[t, v] <- paste(rownames(sorted)[v], " ", "(", z, ")", sep="")
        }
    }
    rs
}

processCorpus <- function(corpus, target, topics=70) {
    corpus <- fromJSON(corpus)

    authors <- asAuthorMatrix(corpus$nomeOradorNormalizado)

    corpus <- Corpus(VectorSource(corpus$conteudo))
    corpus <- tm_map(corpus, tolower)
    corpus <- tm_map(corpus, removePunctuation)
    corpus <- tm_map(corpus, removeNumbers)
    corpus <- tm_map(corpus, removeWords, stopwords("portuguese"))
    corpus <- tm_map(corpus, stripWhitespace)
    corpus <- tm_map(corpus, transliterate)
    corpus <- tm_map(corpus, stemDocumentPortuguese)

    dtm <- DocumentTermMatrix(corpus)

    topics <- exp.agenda.vonmon(term.doc=as.matrix(dtm), authors=authors, n.cats=topics, verbose=TRUE, kappa=400)

    saveRDS(topics, target)

    write.csv(x=exportResult(topics[[2]]), file=paste(target, ".csv", sep=""))
}

parseTagLine <- function(line) {
    line <- gsub("#.*", "", line)
    line <- gsub("^(\\s|\\t)+|(\\s|\\t)+$", "", line)
    return(line)
}

tagResults <- function(corpus, topics, tags) {
    corpus <- fromJSON(corpus)
    topics <- readRDS(topics)
    tags <- readLines(tags)

    # Strip noise from tags (comments, blank lines, etc)
    tags <- lapply(tags, parseTagLine)

    topics <- topics[[1]]

    done <- FALSE
    repeat {
        for (i in 1:dim(topics)[1]) {
            if (c(i) == ncol(topics)) {
                done <- TRUE
            }
            if (tags[i] == "") {
                topics <- topics[,-i]
                break
            }
        }
        if (done) {
            break
        }
    }

    autorTopicOne <- NULL
    for (i in 1:dim(topics)[1]) {
        autorTopicOne[i] <- which.max(topics[i,])
    }
    autorTopicOne <- as.data.frame(autorTopicOne)

    # compute the proportion of documents from each author to each topic
    autorTopicPerc <- prop.table(topics, 1)

    for (i in 1:nrow(autorTopicOne)) {
        autorTopicOne$tag[i] <- tags[ autorTopicOne$autorTopicOne[i] ]
        autorTopicOne$enfase[i] <- autorTopicPerc[i, which.max(autorTopicPerc[i,])]
    }

    autorTopicOne$uf <- corpus$ufOrador[!duplicated(corpus$nomeOradorNormalizado)]
    autorTopicOne$autor <- corpus$nomeOrador[!duplicated(corpus$nomeOradorNormalizado)]
    autorTopicOne$partido <- corpus$partidoOrador[!duplicated(corpus$nomeOradorNormalizado)]
    autorTopicOne$autorNormalizado <- unique(corpus$nomeOradorNormalizado)
    autorTopicOne$ideCadastro <- corpus$ide_cadastro[!duplicated(corpus$nomeOradorNormalizado)]
    autorTopicOne$legislatura <- corpus$num_legislatura[!duplicated(corpus$nomeOradorNormalizado)]

    return(toJSON(autorTopicOne, pretty=TRUE))
}