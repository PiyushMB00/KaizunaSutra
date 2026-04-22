from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/hiragana')
def hiragana():
    return render_template('hiragana.html')

@app.route('/katakana')
def katakana():
    return render_template('katakana.html')

@app.route('/kanji')
def kanji():
    return render_template('kanji.html')

@app.route('/vocabulary')
def vocabulary():
    return render_template('vocabulary.html')

@app.route('/practice')
def practice():
    return render_template('practice.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/about')
def about():
    return render_template('about.html')

if __name__ == '__main__':
    app.run(debug=True, port=5500)
