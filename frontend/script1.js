document.getElementById("continueBtn").addEventListener("click", function () {
  const nickname = document.getElementById("nickname").value.trim();

  if (nickname === "") {
    alert("נא להזין כינוי לפני ההמשך");
    return;
  }

  sessionStorage.setItem("nickname", nickname);

  // אם הכינוי תקין, ממשיכים לדף הבא
  window.location.href = "SelectSubjects.html"; // שנה לכתובת הרצויה
});
