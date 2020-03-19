#!/bin/bash
if [ ! -f "../.env" ]; then
    echo "can't find the ../.env file. You must execute loadDir.sh inside the data folder and make sure a .env file is available in the parent folder"
    exit 1
fi

source ../.env # loading BLAZEGRAPH_PORT and BLAZEGRAPH_NAMESPACE

if [ "$#" -ne 1 ]; then
    echo "1 arguments expected: FILENAME"
    exit 1
fi

FILENAME=$1

if [ -f $FILENAME ]; then
    /bin/bash ./loadFile.sh $FILENAME $BLAZEGRAPH_NAMESPACE $BLAZEGRAPH_PORT
    exit 0
elif [[ -d $FILENAME ]]; then
    files="$(ls $FILENAME)"
    for file in ${files[@]}
    do 
	filerelative="$FILENAME/$file"
        /bin/bash ./loadDir.sh $filerelative
        sleep 10 # a mysterious bug occurs when loading big files too quickly, it stops loading and sometimes a GC overhead happens. 
    done
    exit 0
else
    echo "$FILENAME, file or directory not found"
    exit 1
fi
