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

# helper HTTP
def post_json(u, payload, headers):
    req = Request(u, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    with urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_json(u, headers=None):
    req = Request(u, headers=headers or {})
    with urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

# create user and token
email = 'phasec.test+' + uuid.uuid4().hex[:8] + '@example.com'
password = 'P@ssw0rd' + uuid.uuid4().hex[:8]
try:
    post_json(url.rstrip('/') + '/auth/v1/admin/users',
              {'email': email, 'password': password, 'email_confirm': True},
              {'apikey': svc, 'Authorization': 'Bearer ' + svc, 'Content-Type': 'application/json'})
except HTTPError as e:
    if e.code not in (200,201,409):
        raise

tok = post_json(url.rstrip('/') + '/auth/v1/token?grant_type=password',
                {'email': email, 'password': password},
                {'apikey': anon, 'Content-Type': 'application/json'})
access = tok['access_token']
H = {'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json'}

# upload-url
up = post_json(ROOT + '/upload-url', {'fileName': 'test.wav', 'contentType': 'audio/wav'}, H)

# create job
job = post_json(ROOT + '/jobs', {
  'source_type': 'upload',
  'source_object_path': up['storagePath'],
  'instruments': ['drums'],
  'options': {}
}, H)
job_id = job['jobId']
print('JOB_ID', job_id)

# T24 list jobs
jobs = get_json(ROOT + '/jobs', {'Authorization': 'Bearer ' + access})
print('JOBS_COUNT', jobs.get('total'), 'HAS_MORE', jobs.get('has_more'))

# T25 job detail
job_detail = get_json(ROOT + f'/jobs/{job_id}', {'Authorization': 'Bearer ' + access})
print('JOB_STATUS', job_detail.get('status'))

# Insert a test artifact for T26/T27 via service key
artifact = post_json(url.rstrip('/') + '/rest/v1/artifacts', {
  'job_id': job_id,
  'kind': 'pdf',
  'instrument': 'drums',
  'storage_path': up['storagePath']
}, {'apikey': svc, 'Authorization': 'Bearer ' + svc, 'Content-Type': 'application/json', 'Prefer': 'return=representation'})
artifact_id = artifact[0]['id'] if isinstance(artifact, list) and artifact else artifact['id']
print('ARTIFACT_ID', artifact_id)

# T26 list artifacts
arts = get_json(ROOT + f'/jobs/{job_id}/artifacts', {'Authorization': 'Bearer ' + access})
print('ARTIFACTS_TOTAL', arts.get('total'))

# T27 signed-url
su = get_json(ROOT + f'/artifacts/{artifact_id}/signed-url', {'Authorization': 'Bearer ' + access})
print('SIGNED_URL_PREFIX', su.get('signed_url','')[:32])
