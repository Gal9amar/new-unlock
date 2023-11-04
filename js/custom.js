// to get current year
function getYear() {
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    document.querySelector("#displayYear").innerHTML = currentYear;
}

getYear();

// client section owl carousel
$(".client_owl-carousel").owlCarousel({
    loop: true,
    margin: 20,
    dots: false,
    nav: true,
    navText: [],
    autoplay: true,
    autoplayHoverPause: true,
    navText: [
        '<i class="fa fa-angle-left" aria-hidden="true"></i>',
        '<i class="fa fa-angle-right" aria-hidden="true"></i>'
    ],
    responsive: {
        0: {
            items: 1
        },
        768: {
            items: 2
        }
    }
});

/** google_map js **/

// function myMap() {
//     var mapProp = {
//         center: new google.maps.LatLng(31.874813, 34.736761),
//         zoom: 13,
//     };
//     var map = new google.maps.Map(document.getElementById("googleMap"), mapProp);
// }
const handleSubmit = (event) => {
  event.preventDefault();

  const myForm = event.target;
  const formData = new FormData(myForm);
  
  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString(),
  })
    .then(() => alert("תודה ששלחת לנו הודעה . נחזור בהקדם"))
    .catch((error) => alert(error));
};

document
  .querySelector("form")
  .addEventListener("submit", handleSubmit);
