function toggleStrike(checkbox) {
  const p = checkbox.nextElementSibling;
  if (checkbox.checked) {
    p.classList.add("checked-text");
  } else {
    p.classList.remove("checked-text");
  }
}
