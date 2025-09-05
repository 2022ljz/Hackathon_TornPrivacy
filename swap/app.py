# 最小 Flask 应用：/signup 显示表单；提交后只回显用户名/邮箱（不回显密码）
from flask import Flask, render_template, request, redirect, url_for
app = Flask(__name__)

@app.route("/")
def home():
    return redirect(url_for("signup"))

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        return render_template(
            "confirm.html",
            username=request.form.get("username", ""),
            email=request.form.get("email", "")
        )  # 不回显 password
    return render_template("signup.html")

if __name__ == "__main__":
    app.run(debug=True)  # debug=True 便于调试（代码改动自动重载）
