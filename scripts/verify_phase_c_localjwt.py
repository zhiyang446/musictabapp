import os, json, uuid, time
import jwt
from urllib.request import Request, urlopen

ROOT = 'http://127.0.0.1:8000'

# Load .env
secret = None
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('SUPABASE_JWT_SECRET='):
            secret = line.strip().split('=', 1)[1]
        elif line.startswith('JWT_SECRET=') and not secret:
            secret = line.strip().split('=', 1)[1]
if not secret:
    raise SystemExit('Missing JWT secret in .env')

user_id = str(uuid.uuid4())
now = int(time.time())
payload = {
  'sub': user_id,
  'iat': now,
  'exp': now + 3600,
}
access = jwt.encode(payload, secret, algorithm='HS256')

# /auth/test
req = Request(ROOT + '/auth/test', headers={'Authorization': f'Bearer {access}'})
with urlopen(req) as resp:
    print('AUTH_TEST:', resp.read().decode('utf-8'))

# /upload-url
body = json.dumps({'fileName': 'test.wav', 'contentType': 'audio/wav'}).encode('utf-8')
req = Request(ROOT + '/upload-url', data=body, headers={'Authorization': f'Bearer {access}', 'Content-Type': 'application/json'}, method='POST')
with urlopen(req) as resp:
    up = json.loads(resp.read().decode('utf-8'))
print('UPLOAD_URL:', json.dumps(up))

# /jobs create
job_body = json.dumps({
  'source_type': 'upload',
  'source_object_path': up['storagePath'],
  'youtube_url': None,
  'instruments': ['drums'],
  'options': {}
}).encode('utf-8')
req = Request(ROOT + '/jobs', data=job_body, headers={'Authorization': f'Bearer {access}', 'Content-Type': 'application/json'}, method='POST')
with urlopen(req) as resp:
    job = json.loads(resp.read().decode('utf-8'))
print('JOB_CREATED:', json.dumps(job))
