function handleCredentialResponse(response) {
  const nickname = document.getElementById("nickname").value.trim();

  if (!nickname) {
    alert("נא להזין כינוי לפני ההתחברות");
    return;
  }

  const token = response.credential;
  const payload = JSON.parse(atob(token.split('.')[1]));
  const email = payload.email;

  

  
  localStorage.setItem("nickname", nickname);
  localStorage.setItem("email", email);

  window.location.href = "SelectSubjects.html";
}

window.onload = function () {
  google.accounts.id.initialize({
    client_id: "685319884554-s4u1h9113dkarueaqfja9q7nseq2bs1a.apps.googleusercontent.com", 
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