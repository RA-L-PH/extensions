// This script modifies the appearance of the GitHub profile page
console.log("GitHub Profile Styler loaded");

document.addEventListener("DOMContentLoaded", () => {
  const profileHeader = document.querySelector(".vcard-names");
  if (profileHeader) {
    profileHeader.style.backgroundColor = "#f4f4f4";
    profileHeader.style.border = "2px solid #0366d6";
    profileHeader.style.padding = "10px";
    profileHeader.style.borderRadius = "8px";
    profileHeader.style.textAlign = "center";
  }

  const bio = document.querySelector(".user-profile-bio");
  if (bio) {
    bio.style.fontStyle = "italic";
    bio.style.color = "#555";
  }

  const repoCards = document.querySelectorAll(".repo-card");
  repoCards.forEach(card => {
    card.classList.add("repo-card");
  });
});