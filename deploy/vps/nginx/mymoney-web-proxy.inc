# Cabeceras comunes del proxy hacia el contenedor de la web de MyMoney (se incluye desde mymoney-web.https.conf).
# A diferencia de la API, NO se descarta ninguna cabecera de seguridad: las pone el servidor de la web, una vez cada
# una, y este nginx no anade ninguna.
proxy_http_version 1.1;
proxy_set_header Host $host;
# Se pisa (no se concatena) para que un cliente no pueda falsear su IP con su propia cabecera.
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
