import subprocess, re

result = subprocess.run(['adb', 'logcat', '-d', '--pid=18743', '-s', 'flutter'], capture_output=True, text=True)
lines = result.stdout.split('\n')
msgs = []
for line in lines:
    m = re.search(r'I flutter\s*:\s*(.*)', line)
    if m:
        msgs.append(m.group(1).strip())

# Write error block messages, one per line, max 70 chars per line with continuation
with open('err_clean.txt', 'w', encoding='utf-8') as f:
    for i, msg in enumerate(msgs):
        if any(k in msg for k in ['EXCEPTION', 'BoxConstraints', 'hasSize']):
            start = max(0, i-3)
            end = min(len(msgs), i+50)
            f.write(f"--- MATCH AT INDEX {i} ---\n")
            for j in range(start, end):
                txt = msgs[j]
                # Write in chunks of 70 chars
                while txt:
                    f.write(txt[:70] + '\n')
                    txt = txt[70:]
                f.write("|\n")
            break  # Just the first match

print("Done")
