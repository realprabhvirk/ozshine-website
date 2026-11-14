document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('.site-nav');
  const navLinks = document.querySelectorAll('.nav-links a');
  const navCloseTargets = document.querySelectorAll('[data-nav-close]');
  const revealItems = document.querySelectorAll('[data-reveal]');
  const parallaxItems = document.querySelectorAll('[data-parallax]');
  const locationFinderTools = document.querySelectorAll('[data-location-finder]');
  const locationBookingCards = document.querySelectorAll('[data-booking-location]');
  const mobileBookingForm = document.querySelector('[data-mobile-booking-form]');
  const mobileBookingSubmit = document.querySelector('[data-mobile-booking-submit]');
  const mobileBookingFeedback = document.querySelector('[data-mobile-booking-feedback]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileBookingWorkerUrl = 'https://ozshine-mobile-booking.ozshinecarwash.workers.dev';
  const locations = [
    {
      name: 'Beenleigh',
      address: '114-118 George St, Beenleigh QLD 4207',
      phone: '0449 558 449',
      bookingLabel: 'Book Beenleigh',
      bookingUrl: 'https://www.picktime.com/beenleighozshinecarwash#book/services',
      lat: -27.7116,
      lng: 153.2013
    },
    {
      name: 'Karalee',
      address: '39/52 Junction Rd, Chuwar QLD 4306',
      phone: '0430 295 369',
      bookingLabel: 'Book Karalee',
      bookingUrl: 'https://www.picktime.com/kbozshinecarwash#book',
      lat: -27.5590,
      lng: 152.8180
    },
    {
      name: 'Browns Plains',
      address: '31 Grand Plaza Dr, Browns Plains QLD 4118',
      phone: '0432 521 913',
      bookingLabel: 'Book Browns Plains',
      bookingUrl: 'https://www.picktime.com/kbozshinecarwash#book',
      lat: -27.6603,
      lng: 153.0405
    }
  ];

  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 24);
  };

  const closeMenu = () => {
    if (!header || !menuButton) return;
    header.classList.remove('menu-open');
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-label', 'Open navigation');
    menuButton.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    if (!header || !menuButton) return;
    header.classList.add('menu-open');
    document.body.classList.add('menu-open');
    menuButton.setAttribute('aria-label', 'Close navigation');
    menuButton.setAttribute('aria-expanded', 'true');
  };

  const toggleMenu = () => {
    if (!header) return;
    if (header.classList.contains('menu-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const setFeedback = (feedbackNode, message, isError = false) => {
    if (!feedbackNode) return;
    feedbackNode.textContent = message;
    feedbackNode.classList.toggle('is-error', isError);
  };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const setLoadingState = (submitButton, isLoading) => {
    if (!submitButton) return;
    submitButton.classList.toggle('is-loading', isLoading);
    submitButton.textContent = isLoading ? 'Finding...' : 'Find Location';
    submitButton.disabled = isLoading;
  };

  const setButtonLoadingState = (submitButton, isLoading, loadingText, defaultText) => {
    if (!submitButton) return;
    submitButton.classList.toggle('is-loading', isLoading);
    submitButton.textContent = isLoading ? loadingText : defaultText;
    submitButton.disabled = isLoading;
  };

  const clearNearestResult = (resultNode) => {
    if (!resultNode) return;
    resultNode.classList.remove('is-visible');
    resultNode.classList.remove('nearest-result--booking');
    resultNode.innerHTML = '';
  };

  const clearBookingHighlights = () => {
    if (!locationBookingCards.length) return;
    locationBookingCards.forEach((card) => card.classList.remove('is-highlighted'));
  };

  const highlightBookingLocation = (locationName) => {
    if (!locationBookingCards.length) return;
    clearBookingHighlights();
    const matchingCard = Array.from(locationBookingCards).find((card) => card.dataset.bookingLocation === locationName);
    if (matchingCard) {
      matchingCard.classList.add('is-highlighted');
    }
  };

  const getCoordinates = async (postcode) => {
    const coordinates = typeof QLD_POSTCODE_COORDINATES !== 'undefined'
      ? QLD_POSTCODE_COORDINATES[postcode]
      : null;

    if (!coordinates) {
      throw new Error("Uh oh - you're outside our wash zone! We're Queensland-only for now, but watch this space as we grow.");
    }

    return { lat: coordinates[0], lng: coordinates[1] };
  };

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const toRadians = (value) => value * (Math.PI / 180);
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);
    const a = Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  };

  const findNearestLocation = (userCoordinates) => {
    return locations.reduce((closest, location) => {
      const distance = getDistance(userCoordinates.lat, userCoordinates.lng, location.lat, location.lng);

      if (!closest || distance < closest.distance) {
        return {
          ...location,
          distance
        };
      }

      return closest;
    }, null);
  };

  const renderNearestLocation = (resultNode, location, mode = 'default') => {
    if (!resultNode) return;

    const distanceText = `${location.distance.toFixed(1)} km away`;
    const mapsQuery = encodeURIComponent(location.address);
    const isBookingMode = mode === 'booking';
    const bookingAction = location.bookingUrl && location.bookingLabel
      ? `<a class="btn btn-primary" href="${location.bookingUrl}" target="_blank" rel="noopener noreferrer">${location.bookingLabel}</a>`
      : '';

    if (isBookingMode) {
      resultNode.innerHTML = `
        <span class="nearest-result__eyebrow">Nearest OzShine Location</span>
        <h3>${location.name}</h3>
        <p>${location.address}</p>
        <p class="nearest-result__distance">${distanceText}</p>
        <a class="location-phone" href="tel:${location.phone.replace(/\s+/g, '')}">${location.phone}</a>
        <div class="nearest-result__actions">
          ${bookingAction}
          <a class="btn btn-light" href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener noreferrer">Get Directions</a>
        </div>
      `;
    } else {
      resultNode.innerHTML = `
        <span class="nearest-result__eyebrow">Nearest OzShine Location</span>
        <h3>${location.name}</h3>
        <p>${location.address}</p>
        <p class="nearest-result__distance">${distanceText}</p>
        <a class="location-phone" href="tel:${location.phone.replace(/\s+/g, '')}">${location.phone}</a>
        <div class="nearest-result__actions">
          ${bookingAction}
          <a class="btn btn-light" href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener noreferrer">Get Directions</a>
        </div>
      `;
    }

    resultNode.classList.toggle('nearest-result--booking', isBookingMode);
    resultNode.classList.add('is-visible');
  };

  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  if (menuButton && header && nav) {
    menuButton.addEventListener('click', toggleMenu);

    navLinks.forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    navCloseTargets.forEach((target) => {
      target.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('menu-open')) {
        closeMenu();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) {
        closeMenu();
      }
    });
  }

  if (revealItems.length) {
    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add('revealed'));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.16,
        rootMargin: '0px 0px -40px 0px'
      });

      revealItems.forEach((item) => observer.observe(item));
    }
  }

  if (parallaxItems.length && !reduceMotion) {
    let ticking = false;

    const updateParallax = () => {
      const viewportHeight = window.innerHeight;

      parallaxItems.forEach((item) => {
        const rect = item.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > viewportHeight) {
          item.style.transform = 'translate3d(0, 0, 0)';
          return;
        }

        const offset = (rect.top - viewportHeight / 2) * -0.03;
        const limitedOffset = Math.max(Math.min(offset, 18), -18);
        item.style.transform = `translate3d(0, ${limitedOffset}px, 0) scale(1.02)`;
      });

      ticking = false;
    };

    const requestParallax = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    updateParallax();
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax);
  }

  if (locationFinderTools.length) {
    locationFinderTools.forEach((tool) => {
      const nearestForm = tool.querySelector('.nearest-form');
      const postcodeInput = tool.querySelector('.nearest-input');
      const nearestFeedback = tool.querySelector('.nearest-feedback');
      const nearestResult = tool.querySelector('.nearest-result');
      const nearestSubmit = tool.querySelector('.nearest-submit');
      const finderMode = tool.dataset.finderMode || 'default';

      if (!nearestForm || !postcodeInput || !nearestFeedback || !nearestResult || !nearestSubmit) {
        return;
      }

      const handleFinderSubmit = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const postcode = postcodeInput.value.trim();

        clearNearestResult(nearestResult);
        if (finderMode === 'booking') {
          clearBookingHighlights();
        }

        if (!postcode) {
          setFeedback(nearestFeedback, 'Please enter your postcode first.', true);
          postcodeInput.focus();
          return;
        }

        if (!/^\d{4}$/.test(postcode)) {
          setFeedback(nearestFeedback, 'Please enter a valid 4-digit Australian postcode.', true);
          postcodeInput.focus();
          return;
        }

        setLoadingState(nearestSubmit, true);
        setFeedback(nearestFeedback, 'Finding your nearest location...');

        try {
          const coordinates = await getCoordinates(postcode);
          const nearestLocation = findNearestLocation(coordinates);

          if (!nearestLocation) {
            throw new Error('We could not match that postcode to a nearby location.');
          }

          renderNearestLocation(nearestResult, nearestLocation, finderMode);
          if (finderMode === 'booking') {
            highlightBookingLocation(nearestLocation.name);
          }
          setFeedback(nearestFeedback, '');
        } catch (error) {
          clearNearestResult(nearestResult);
          if (finderMode === 'booking') {
            clearBookingHighlights();
          }
          setFeedback(nearestFeedback, error.message || 'Something went wrong while finding your nearest location.', true);
        } finally {
          setLoadingState(nearestSubmit, false);
        }
      };

      nearestForm.addEventListener('submit', handleFinderSubmit);
      nearestSubmit.addEventListener('click', handleFinderSubmit);
      postcodeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          handleFinderSubmit(event);
        }
      });
    });
  }

  if (mobileBookingForm && mobileBookingSubmit && mobileBookingFeedback) {
    mobileBookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(mobileBookingForm);
      const phoneCountryCode = String(formData.get('phoneCountryCode') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const payload = {
        name: String(formData.get('name') || '').trim(),
        phoneCountryCode,
        phone,
        fullPhone: [phoneCountryCode, phone].filter(Boolean).join(' ').trim(),
        location: String(formData.get('location') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        vehicleType: String(formData.get('vehicleType') || '').trim(),
        rego: String(formData.get('rego') || '').trim(),
        notes: String(formData.get('notes') || '').trim()
      };

      if (!payload.name || !payload.phoneCountryCode || !payload.phone || !payload.location) {
        setFeedback(mobileBookingFeedback, 'Unable to send your booking enquiry right now. Please try again.', true);
        return;
      }

      if (payload.email && !isValidEmail(payload.email)) {
        setFeedback(mobileBookingFeedback, 'Unable to send your booking enquiry right now. Please try again.', true);
        return;
      }

      if (mobileBookingWorkerUrl.includes('REPLACE_WITH_YOUR_WORKER_URL')) {
        setFeedback(mobileBookingFeedback, 'Unable to send your booking enquiry right now. Please try again.', true);
        return;
      }

      setButtonLoadingState(mobileBookingSubmit, true, 'Sending...', 'Send Booking Request');
      setFeedback(mobileBookingFeedback, '');

      try {
        const response = await fetch(mobileBookingWorkerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error('Request failed');
        }

        mobileBookingForm.reset();
        setFeedback(mobileBookingFeedback, 'Thank you. Your mobile detailing enquiry has been sent.');
      } catch (error) {
        setFeedback(mobileBookingFeedback, 'Unable to send your booking enquiry right now. Please try again.', true);
      } finally {
        setButtonLoadingState(mobileBookingSubmit, false, 'Sending...', 'Send Booking Request');
      }
    });
  }
});
