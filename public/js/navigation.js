const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-navigation");
const menuLabel = menuToggle.querySelector(".sr-only");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuLabel.textContent = isExpanded ? "Abrir menu" : "Fechar menu";
  navigation.classList.toggle("is-open", !isExpanded);
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a, .cart-trigger")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuLabel.textContent = "Abrir menu";
    navigation.classList.remove("is-open");
  }
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
