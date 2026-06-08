import json

log_path = "/Users/tang/.gemini/antigravity/brain/92ac0109-f091-426b-afc7-77e489b0592b/.system_generated/logs/transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    steps = [json.loads(line) for line in f]

for idx in [516, 510, 456, 255, 71, 61]:
    if idx >= len(steps):
        continue
    step = steps[idx]
    tool_calls = step.get('tool_calls', [])
    print(f"--- Step {idx} ---")
    for tc_idx, tc in enumerate(tool_calls):
        method = tc.get('method')
        # Check all keys in tc
        print(f"  Tool Call {tc_idx}: keys = {list(tc.keys())}")
        if 'name' in tc:
            print(f"    name: {tc['name']}")
        if 'args' in tc:
            args = tc['args']
            print(f"    args keys: {list(args.keys())}")
            # If it's a write_to_file, we print CodeContent
            if 'CodeContent' in args:
                print(f"    CodeContent len: {len(args['CodeContent'])}")
            if 'ReplacementContent' in args:
                print(f"    ReplacementContent len: {len(args['ReplacementContent'])}")
            if 'ReplacementChunks' in args:
                print(f"    ReplacementChunks count: {len(args['ReplacementChunks'])}")
                for chunk in args['ReplacementChunks']:
                    print(f"      Chunk keys: {list(chunk.keys())}")
