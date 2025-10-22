document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.population-selector button');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const link = button.dataset.link;
      const population = button.dataset.population;

      if (!link) return;

      if (population) {
        localStorage.setItem('hubbyPopulation', population);
      }

      document.body.classList.add('fade-out');

      setTimeout(() => {
        window.location.href = link;
      }, 400);
    });
  });
});
