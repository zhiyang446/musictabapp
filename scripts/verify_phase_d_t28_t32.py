import os, json, uuid, time
from urllib.request import Request, urlopen

ROOT = 'http://127.0.0.1:8000'

# Load env
env = {}
with open('.env','r',encoding='utf-8') as f:
  for line in f:
    if '=' in line and not line.strip().startswith('#'):
      k,v = line.strip().split('=',1)
      env[k]=v
url = env['SUPABASE_URL']; anon=env['SUPABASE_ANON_KEY']

# get token
req = Request(url.rstrip('/') + '/auth/v1/token?grant_type=password',
              data=json.dumps({'email': 'phaseD.test+'+uuid.uuid4().hex[:8]+'@example.com', 'password': 'P@ssw0rd123!'}).encode('utf-8'),
              headers={'apikey': anon, 'Content-Type':'application/json'}, method='POST')
# first call will 400 if user not exist; create user then retry
try:
  with urlopen(req) as resp:
    tok = json.loads(resp.read().decode('utf-8'))
except Exception:
  # create
  admin = Request(url.rstrip('/') + '/auth/v1/admin/users',
                  data=json.dumps({'email': 'phaseD@ex.com','password':'P@ssw0rd123!','email_confirm':True}).encode('utf-8'),
                  headers={'apikey': env['SUPABASE_SERVICE_ROLE_KEY'],'Authorization':'Bearer '+env['SUPABASE_SERVICE_ROLE_KEY'],'Content-Type':'application/json'}, method='POST')
  try:
    urlopen(admin).read()
  except Exception:
    pass
  # token again
  req = Request(url.rstrip('/') + '/auth/v1/token?grant_type=password',
              data=json.dumps({'email': 'phaseD@ex.com', 'password': 'P@ssw0rd123!'}).encode('utf-8'),
              headers={'apikey': anon, 'Content-Type':'application/json'}, method='POST')
  with urlopen(req) as resp:
    tok = json.loads(resp.read().decode('utf-8'))
access = tok['access_token']
H={'Authorization':'Bearer '+access,'Content-Type':'application/json'}

# upload-url -> job -> poll jobs status
up = Request(ROOT+'/upload-url', data=json.dumps({'fileName':'d.wav','contentType':'audio/wav'}).encode('utf-8'), headers=H, method='POST')
with urlopen(up) as r: upo=json.loads(r.read().decode('utf-8'))
job = Request(ROOT+'/jobs', data=json.dumps({'source_type':'upload','source_object_path':upo['storagePath'],'instruments':['drums'],'options':{}}).encode('utf-8'), headers=H, method='POST')
with urlopen(job) as r: j=json.loads(r.read().decode('utf-8'))
job_id=j['jobId']
print('JOB',job_id)
# simple poll
import time
for _ in range(10):
  time.sleep(1)
  req = Request(ROOT+f'/jobs/{job_id}', headers={'Authorization':'Bearer '+access})
  with urlopen(req) as resp:
    d = json.loads(resp.read().decode('utf-8'))
  print('STATUS', d.get('status'), d.get('progress'))
  if d.get('status')=='SUCCEEDED':
    break
