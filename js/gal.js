window.onscroll = function() {scrollFunction()};

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
  const message = `היי, אני מעוניין לקנות את המוצר ${item} במחיר של ${price}`;
  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/+972533888381?text=${encodedMessage}`;
  window.open(whatsappLink);
}



const buyNowButton = document.querySelector('.buy-now-button');
buyNowButton.addEventListener('click', buyWithWhatsApp);

$(document).ready(function(){
  $('#my_slider').carousel({
    interval: 3000, // set the interval between slides in milliseconds
    pause: 'hover', // pause the carousel on mouse hover
    wrap: true // allow the carousel to loop back to the beginning
  });
});


