//sidebar
function openNav() {
    document.getElementById("mySidebar").style.left = "0";
}
function closeNav() {
    document.getElementById("mySidebar").style.left = "-350px";
}

//sidebar2
function openNav() {
    document.getElementById("mySidebar2").style.left = "0";
}
function closeNav() {
    document.getElementById("mySidebar2").style.left = "-100%";
}

//sidebar3
function openNav() {
    document.getElementById("mySidebar3").style.left = "0";
}
function closeNav() {
    document.getElementById("mySidebar3").style.left = "-100%";
}

//slider homepage
$('#sliderHeader').carousel({
    pause: null
});

//Back to top
if ($('#back-to-top').length) {
    var scrollTrigger = 100, // px
        backToTop = function () {
            var scrollTop = $(window).scrollTop();
            if (scrollTop > scrollTrigger) {
                $('#back-to-top').addClass('show');
            } else {
                $('#back-to-top').removeClass('show');
            }
        };
    backToTop();
    $(window).on('scroll', function () {
        backToTop();
    });
    $('#back-to-top').on('click', function (e) {
        e.preventDefault();
        $('html,body').animate({
            scrollTop: 0
        }, 700);
    });
}
