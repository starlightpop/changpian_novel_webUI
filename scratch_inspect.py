with open('src/main.js', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

print("File total lines:", len(lines))
start = 2498 - 1
end = min(len(lines), 2550)
for idx in range(start, end):
    print(f"{idx+1}: {lines[idx]}", end="")
