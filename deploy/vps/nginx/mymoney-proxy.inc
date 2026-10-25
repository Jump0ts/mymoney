# Cabeceras comunes del proxy hacia la API de MyMoney (se incluye desde mymoney-api.https.conf).
proxy_http_version 1.1;
# La API (Helmet) ya envia sus propias cabeceras de seguridad y el vhost anade las suyas: se descartan las de la
# API para que cada cabecera salga UNA vez, con el valor del vhost (si no, salen duplicadas y, en el caso de
# X-Frame-Options, con valores contradictorios).
proxy_hide_header Strict-Transport-Security;
proxy_hide_header X-Content-Type-Options;
proxy_hide_header X-Frame-Options;
proxy_hide_header Content-Security-Policy;
proxy_hide_header Referrer-Policy;
proxy_set_header Host $host;
# Se pisa (no se concatena) para que un cliente no pueda falsear su IP con su propia cabecera.
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
