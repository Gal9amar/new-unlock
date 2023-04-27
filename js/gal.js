window.onscroll = function () { scrollFunction() };

function scrollFunction() {
  if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
    document.getElementById("back-to-top-btn").style.display = "block";
  } else {
    document.getElementById("back-to-top-btn").style.display = "none";
  }
}
function scrollToTop() {
  var position =
    document.body.scrollTop || document.documentElement.scrollTop;
  if (position) {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}


function buyWithWhatsApp(item, price) {
  const message = `היי, יש לי שאלה בנוגע למוצר זה ${item} במחיר של ${price}`;
  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/+972533888381?text=${encodedMessage}`;
  window.open(whatsappLink);
}

window.addEventListener('load', function() {
// floating menu
  const menuBtn = document.querySelector('.menu-btn');
  const menuContainer = document.querySelector('.menu-container');
  const menuItems = menuContainer.querySelectorAll('ul li a');

  function toggleMenu() {
    menuContainer.classList.toggle('open');
  }

  menuBtn.addEventListener('click', toggleMenu);

  menuItems.forEach(function(item) {
    item.addEventListener('click', function() {
      toggleMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (!menuContainer.contains(event.target)) {
      menuContainer.classList.remove('open');
    }
  });
});