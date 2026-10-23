/* LeToG – interests / onboarding page */

var INTERESTS = [
  { name: "Programming", icon: "code" },
  { name: "Web Development", icon: "browser" },
  { name: "Data Science", icon: "chart" },
  { name: "Mathematics", icon: "chart" },
  { name: "Science", icon: "atom" },
  { name: "Design", icon: "pen" },
  { name: "Business", icon: "bag" },
  { name: "Python", icon: "code" },
  { name: "Other", icon: "dots" },
];

document.addEventListener("DOMContentLoaded", function () {
  var selected = Store.read("letog_interests", []);
  var grid = qs("#interestGrid");
  var count = qs("#interestCount");

  grid.innerHTML = INTERESTS.map(function (interest) {
    var on = selected.indexOf(interest.name) !== -1;
    return (
      '<button class="interest-card" type="button" data-interest="' + interest.name + '" ' +
      'aria-pressed="' + (on ? "true" : "false") + '">' +
      (ICONS[interest.icon] || ICONS.star) +
      "<span>" + interest.name + "</span>" +
      '<span class="mark" aria-hidden="true">Selected</span>' +
      "</button>"
    );
  }).join("");

  function updateCount() {
    count.textContent = selected.length
      ? selected.length + " selected: " + selected.join(", ")
      : "No interests selected yet.";
  }
  updateCount();

  grid.addEventListener("click", function (event) {
    var card = event.target.closest("[data-interest]");
    if (!card) {
      return;
    }
    var name = card.getAttribute("data-interest");
    var index = selected.indexOf(name);
    if (index === -1) {
      selected.push(name);
    } else {
      selected.splice(index, 1);
    }
    card.setAttribute("aria-pressed", index === -1 ? "true" : "false");
    Store.write("letog_interests", selected);
    updateCount();
  });

  qs("#continueBtn").addEventListener("click", function () {
    Store.write("letog_interests", selected);
    showToast("Interests saved");
    window.setTimeout(function () {
      window.location.href = "home.html";
    }, 600);
  });
});
