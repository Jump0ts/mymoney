# Cabeceras comunes del proxy hacia la API de MyMoney (se incluye desde mymoney-api.https.conf).
proxy_http_version 1.1;
proxy_set_header Host $host;
# Se pisa (no se concatena) para que un cliente no pueda falsear su IP con su propia cabecera.
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
