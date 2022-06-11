#FROM python:3-alpine
FROM python:3.9.10-slim

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN python3 -m pip install --upgrade pip
RUN pip install pyle38

COPY requirements.txt /usr/src/app/

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . /usr/src/app

EXPOSE 5000

ENTRYPOINT ["python3"]

CMD ["-um", "openapi_server"]