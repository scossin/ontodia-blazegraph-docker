#!/bin/bash
if [ "$#" -ne 3 ]; then
    echo "3 arguments expected: FILENAME BLAZEGRAPH_NAMESPACE BLAZEGRAPH_PORT"
    exit 1
fi

SCRIPT=$0
SCRIPT_ABSOLUTE="$(realpath $SCRIPT)"

FILENAME=$1
BLAZEGRAPH_NAMESPACE=$2
BLAZEGRAPH_PORT=$3

if [ -f $FILENAME ]; then
    /bin/bash ./loadFile.sh $FILENAME $BLAZEGRAPH_NAMESPACE $BLAZEGRAPH_PORT
    exit 0
elif [[ -d $FILENAME ]]; then
    files="$(ls $FILENAME)"
    for file in ${files[@]}
    do 
	filerelative="$FILENAME/$file"
        /bin/bash ./loadDir.sh $filerelative $BLAZEGRAPH_NAMESPACE $BLAZEGRAPH_PORT
        sleep 10 # a mysterious bug occurs when loading big files too quickly, it stops loading and sometimes a GC overhead happens. 
    done
    exit 0
else
    echo "$FILENAME, file or directory not found"
    exit 1
fi
