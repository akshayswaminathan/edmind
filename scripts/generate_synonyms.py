import json, os, time, urllib.request, urllib.error

# Load gold standard
with open(os.path.join(os.path.dirname(__file__), '../src/data/gold_standard.json')) as f:
    gold_standard = json.load(f)

# Get all unique diagnosis names
all_names = set()
for item in gold_standard:
    for d in item['red'] + item['yellow']:
        all_names.add(d['name'])

names_list = sorted(all_names)
print(f"Total unique diagnoses: {len(names_list)}")

BATCH_SIZE = 80
batches = [names_list[i:i+BATCH_SIZE] for i in range(0, len(names_list), BATCH_SIZE)]
print(f"Will process {len(batches)} batches")

api_key = os.environ['OPENAI_API_KEY']
synonym_map = {}

for bi, batch in enumerate(batches):
    print(f"Processing batch {bi+1}/{len(batches)} ({len(batch)} diagnoses)...")
    
    prompt = f"""You are a medical terminology expert. For each diagnosis below, provide common synonyms, abbreviations, and informal terms that a medical student or doctor might use to refer to it.

Return a JSON object where each key is the EXACT diagnosis name I give you, and the value is an array of alternative terms.

Rules:
- Include common abbreviations (e.g., "MI" for "Myocardial infarction")  
- Include lay terms (e.g., "heart attack" for "Myocardial infarction")
- Include alternative medical terms (e.g., "stroke" or "CVA" for "Cerebral infarction")
- Keep each synonym concise (1-4 words)
- Include 2-8 synonyms per diagnosis
- If no common synonyms exist, provide an empty array
- Make synonyms LOWERCASE

Diagnoses:
{chr(10).join(f'{i+1}. {n}' for i, n in enumerate(batch))}

Return ONLY valid JSON, no markdown formatting."""

    body = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 4096
    }).encode()
    
    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
        
        content = data['choices'][0]['message']['content'].strip()
        content = content.replace('```json\n', '').replace('\n```', '').replace('```', '')
        
        batch_result = json.loads(content)
        synonym_map.update(batch_result)
        print(f"  Got synonyms for {len(batch_result)} diagnoses")
    except Exception as e:
        print(f"  Error: {e}")
        for name in batch:
            synonym_map[name] = []
    
    if bi < len(batches) - 1:
        time.sleep(0.5)

# Save
out_path = os.path.join(os.path.dirname(__file__), '../src/data/synonym_map.json')
with open(out_path, 'w') as f:
    json.dump(synonym_map, f, indent=2, ensure_ascii=False)

print(f"\nSaved {len(synonym_map)} entries to synonym_map.json")

# Show examples
examples = ['Myocardial infarction', 'Cerebral infarction', 'Subarachnoid hemorrhage', 'Pulmonary embolism', 'Aortic dissection', 'Septic shock', 'Meningitis']
for ex in examples:
    if ex in synonym_map:
        print(f"  {ex}: {synonym_map[ex]}")

