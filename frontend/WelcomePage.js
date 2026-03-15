function handleCredentialResponse(response) {
  const nickname = document.getElementById("nickname").value.trim();

  if (!nickname) {
    alert("נא להזין כינוי לפני ההתחברות");
    return;
  }

  const token = response.credential;
  const payload = JSON.parse(atob(token.split('.')[1]));
  const email = payload.email;

  if (!email.endsWith('@mail.huji.ac.il')) {
    alert("המערכת פתוחה רק למשתמשי mail.huji.ac.il");
    return;
  }

  // שמירה
  localStorage.setItem("nickname", nickname);
  localStorage.setItem("email", email);

  window.location.href = "SelectSubjects.html";
}

window.onload = function () {
  google.accounts.id.initialize({
    client_id: "47791734926-irigvga2ettupaapukbsmkoaovgkuf83.apps.googleusercontent.com",
    callback: handleCredentialResponse
  });

  google.accounts.id.renderButton(
    document.getElementById("googleSignInDiv"),
    {
      theme: "filled_blue",
      size: "large",
      text: "signin_with",
      shape: "pill"
    }
  );
};
