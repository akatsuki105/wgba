import json
import subprocess

f = open("package.json", "r")
data = json.load(f)

counter = 0
add_dev = "yarn add -D "
for k in data["devDependencies"]:
    add_dev += k + " "
    counter += 1
if counter > 0:
    print(add_dev)
    subprocess.run(add_dev, shell=True)

counter = 0
add = "yarn add "
for k in data["dependencies"]:
    add += k + " "
    counter += 1
if counter > 0:
    print(add)
    subprocess.run(add, shell=True)
