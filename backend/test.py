import google.generativeai as genai

genai.configure(api_key="AIzaSyDK89HiVC0g85YYIgYDww377Gmwa6EnkTs")

models = genai.list_models()

for model in models:
    print(model.name)
