function buyWithWhatsApp(item, price) {
  const message = `היי, אני מעוניין לקנות את המוצר ${item} במחיר של ${price}`;
  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/+972522010200?text=${encodedMessage}`;
  window.open(whatsappLink);
}



const buyNowButton = document.querySelector('.buy-now-button');
buyNowButton.addEventListener('click', buyWithWhatsApp);