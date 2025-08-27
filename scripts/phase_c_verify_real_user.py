import os, json, uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = 'http://127.0.0.1:8000'

# Load env
env = {}
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        if '=' in line and not line.strip().startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v
url = env.get('SUPABASE_URL')
anon = env.get('SUPABASE_ANON_KEY')
svc = env.get('SUPABASE_SERVICE_ROLE_KEY')
if not (url and anon and svc):
    raise SystemExit('Missing Supabase env in .env')

email = 'orchestrator.test+' + uuid.uuid4().hex[:8] + '@example.com'
password = 'P@ssw0rd' + uuid.uuid4().hex[:8]

# Admin create user
try:
    req = Request(url.rstrip('/') + '/auth/v1/admin/users',
                  data=json.dumps({
                      'email': email,
                      'password': password,
                      'email_confirm': True
                  }).encode('utf-8'),
                  headers={
                      'apikey': svc,
                      'Authorization': 'Bearer ' + svc,
                      'Content-Type': 'application/json'
                  }, method='POST')
    with urlopen(req) as resp:
        resp.read()
except HTTPError as e:
    if e.code not in (200, 201, 409):
        print('Admin create user failed:', e.read().decode('utf-8'))
        raise

# Password grant
req = Request(url.rstrip('/') + '/auth/v1/token?grant_type=password',
              data=json.dumps({'email': email, 'password': password}).encode('utf-8'),
              headers={'apikey': anon, 'Content-Type': 'application/json'}, method='POST')
with urlopen(req) as resp:
    tok = json.loads(resp.read().decode('utf-8'))
access = tok.get('access_token')
if not access:
    raise SystemExit('Failed to obtain access token')

# /auth/test
req = Request(ROOT + '/auth/test', headers={'Authorization': 'Bearer ' + access})
with urlopen(req) as resp:
    print('AUTH_TEST:', resp.read().decode('utf-8'))

# /upload-url
body = json.dumps({'fileName': 'test.wav', 'contentType': 'audio/wav'}).encode('utf-8')
req = Request(ROOT + '/upload-url', data=body, headers={'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json'}, method='POST')
with urlopen(req) as resp:
    up = json.loads(resp.read().decode('utf-8'))
print('UPLOAD_URL:', json.dumps(up))

# /jobs
job_body = json.dumps({
  'source_type': 'upload',
  'source_object_path': up['storagePath'],
  'instruments': ['drums'],
  'options': {}
}).encode('utf-8')
req = Request(ROOT + '/jobs', data=job_body, headers={'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json'}, method='POST')
with urlopen(req) as resp:
    job = json.loads(resp.read().decode('utf-8'))
print('JOB_CREATED:', json.dumps(job))
