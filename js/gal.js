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

window.addEventListener('DOMContentLoaded', (event) => {
  // your JavaScript code here
  (function(){
    'use strict';

    class Menu {
      constructor(settings) {
        this.nodeMenu = settings.nodeMenu;
        this.toggleMenu = this.toggle.bind(this);
        settings.nodeMenuButton.addEventListener('click', this.toggleMenu);
      }

      toggle() {
        return this.nodeMenu.classList.toggle('js-menu_activated');
      }

      close() {
        this.nodeMenu.classList.remove('js-menu_activated');
      }
    }

    let nodeMenu = document.querySelector('body');
    let menu = new Menu({
      nodeMenu: nodeMenu,
      nodeMenuButton: nodeMenu.querySelector('.js-menu__toggle')
    });

    // Create a new function to close the menu
    function closeMenu() {
      menu.close();
    }

    // Export the closeMenu function
    window.closeMenu = closeMenu;
  })();
});
