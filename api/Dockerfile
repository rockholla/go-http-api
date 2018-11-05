FROM golang:1.10.5-alpine3.8

RUN mkdir /lib64 && ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2
COPY main.go /tmp/main.go

RUN apk add --no-cache --virtual .build-deps git
RUN go get github.com/gorilla/mux
RUN go build -o /bin/go-http-api /tmp/main.go
RUN apk del .build-deps

EXPOSE 3000
CMD "/bin/go-http-api"
