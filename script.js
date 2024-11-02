document.addEventListener("DOMContentLoaded", () => {
  let balance = 10000;
  let coins = [
    { name: "$MEMETD", price: 0.05, lastPrice: 0.05, trend: 0.01 },
  ];
  let positions = [];
  let tradeHistory = [];
  let cumulativePL = 0; // Cumulative Profit/Loss tracker
  let selectedCoin = null;
  let chart = null;
  let plChart = null;
  let chartData = [];

  document.getElementById("buy-button").addEventListener("click", buyCoin);
  document.getElementById("sell-button").addEventListener("click", sellCoin);
  document.getElementById("max-sell-button").addEventListener("click", maxSell);

  function initialize() {
    updateBalanceDisplay();
    updateMarket();
    startCountdown();
    setupPLChart();
  }

  function updateBalanceDisplay() {
    const balanceElement = document.getElementById("balance");
    if (balanceElement) {
      balanceElement.innerText = `$${balance.toFixed(2)}`;
    } else {
      console.error("Balance element not found!");
    }
  }

  function buyCoin() {
    if (!selectedCoin) {
      alert("Please select a coin first.");
      return;
    }
    const dollarAmount = parseFloat(document.getElementById("amount").value);
    if (isNaN(dollarAmount) || dollarAmount <= 0) {
      alert("Please enter a valid amount in dollars.");
      return;
    }
    if (dollarAmount > balance) {
      alert("Insufficient balance.");
      return;
    }

    const amount = dollarAmount / selectedCoin.price;

    balance -= dollarAmount;
    updateBalanceDisplay();

    const existingPosition = positions.find(pos => pos.coin === selectedCoin.name);
    if (existingPosition) {
      const existingAmount = existingPosition.amount;
      existingPosition.amount += amount;
      existingPosition.purchasePrice = ((existingPosition.purchasePrice * existingAmount) + dollarAmount) / existingPosition.amount;
    } else {
      positions.push({
        coin: selectedCoin.name,
        amount,
        purchasePrice: selectedCoin.price,
      });
    }
    document.getElementById("amount").value = "";
    updatePositions();
  }

  function sellCoin() {
    if (!selectedCoin) {
      alert("Please select a coin first.");
      return;
    }
    const dollarAmount = parseFloat(document.getElementById("amount").value);
    if (isNaN(dollarAmount) || dollarAmount <= 0) {
      alert("Please enter a valid amount to sell.");
      return;
    }

    const positionIndex = positions.findIndex(pos => pos.coin === selectedCoin.name);
    if (positionIndex === -1) {
      alert("You do not have a position in this coin.");
      return;
    }

    const position = positions[positionIndex];
    const amountToSell = dollarAmount / selectedCoin.price;

    if (amountToSell > position.amount) {
      alert("Insufficient amount in position.");
      return;
    }

    const saleProceeds = selectedCoin.price * amountToSell;
    balance += saleProceeds;
    updateBalanceDisplay();

    const profitLoss = saleProceeds - (position.purchasePrice * amountToSell);
    tradeHistory.push(profitLoss);
    cumulativePL += profitLoss; // Update cumulative profit/loss
    updatePLChart();

    position.amount -= amountToSell;
    if (position.amount === 0) {
      positions.splice(positionIndex, 1);
    }
    document.getElementById("amount").value = "";
    updatePositions();
  }

  function maxSell() {
    if (!selectedCoin) {
      alert("Please select a coin first.");
      return;
    }
    const position = positions.find(pos => pos.coin === selectedCoin.name);
    if (!position) {
      alert("You do not have any holdings in the selected coin.");
      return;
    }
    const dollarValue = position.amount * selectedCoin.price;
    document.getElementById("amount").value = dollarValue.toFixed(2);
  }

  function updateMarket() {
    coins.forEach(coin => {
      coin.lastPrice = coin.price;
      coin.price = simulatePriceChange(coin.price, coin.trend);
    });

    const coinList = document.getElementById("coin-list");
    coinList.innerHTML = coins.map(coin => {
      const priceDirection = coin.price > coin.lastPrice ? 'up' : 'down';
      return `
        <div onclick="selectCoin('${coin.name}')" class="coin-option">
          <span>${coin.name}</span>
          <span>Price: <span class="${priceDirection}">$${coin.price.toFixed(4)}</span></span>
        </div>
      `;
    }).join("");

    updatePositions();
    if (selectedCoin) updateChart();
  }

  window.selectCoin = function (coinName) {
    selectedCoin = coins.find(coin => coin.name === coinName);
    document.getElementById("chart-title").innerText = `${selectedCoin.name} Price Chart`;
    if (!chartData[selectedCoin.name]) {
      chartData[selectedCoin.name] = [];
    }
    setupChart();
  };

  function setupChart() {
    if (chart) chart.destroy();
    const ctx = document.getElementById("coinChart").getContext("2d");
    chart = new Chart(ctx, {
      type: 'line', // Change to line chart
      data: {
        labels: Array.from({ length: chartData[selectedCoin.name].length }, (_, i) => i + 1),
        datasets: [{
          label: `${selectedCoin.name} Price`,
          data: chartData[selectedCoin.name],
          borderColor: '#00ff00',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Disable animation to make updates immediate
        scales: {
          x: {
            display: true,
            color: '#00ff00'
          },
          y: {
            beginAtZero: false,
            display: true,
            color: '#00ff00'
          }
        }
      }
    });
  }

  function setupPLChart() {
    const ctx = document.getElementById("plChart").getContext("2d");
    plChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Cumulative Profit/Loss',
          data: [],
          borderColor: '#00ff00',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            color: '#00ff00'
          }
        }
      }
    });
  }

  function updatePLChart() {
    plChart.data.labels.push(`Trade ${plChart.data.labels.length + 1}`);
    plChart.data.datasets[0].data.push(cumulativePL);
    plChart.update();
  }

  function updateChart() {
    if (!selectedCoin) return;

    chartData[selectedCoin.name].push(selectedCoin.price);
    if (chartData[selectedCoin.name].length > 20) {
      chartData[selectedCoin.name].shift(); // Keep the last 20 points for the scrolling effect
    }

    chart.data.labels = Array.from({ length: chartData[selectedCoin.name].length }, (_, i) => i + 1);
    chart.data.datasets[0].data = chartData[selectedCoin.name];
    chart.update('none'); // Use 'none' mode to avoid animation and ensure the lines appear immediately
  }

  function simulatePriceChange(currentPrice, trend) {
    const isDip = Math.random() < 0.25 && Math.random() < 0.5; // Random dips with an additional condition to make them less predictable
    let newPrice = currentPrice * (1 + trend + (isDip ? -0.15 : 0.01)); // Gradual increase with occasional more significant dips
    return Math.max(newPrice, 0.01);
  }

  function startCountdown() {
    let timer = 15;
    const countdown = setInterval(() => {
      const timerElement = document.getElementById("timer");
      if (timerElement) {
        timerElement.innerText = `${timer}s`;
      } else {
        console.error("Timer element not found!");
      }
      if (timer <= 0) {
        clearInterval(countdown);
        addNewCoin();
        startCountdown();
      }
      timer--;
    }, 1000);
  }

  function addNewCoin() {
    const newCoin = {
      name: "$NEW" + Math.floor(Math.random() * 100),
      price: 0.05,
      lastPrice: 0.05,
      trend: 0.01 + Math.random() * 0.015
    };
    coins.push(newCoin);
    updateMarket();
  }

  function updatePositions() {
    const positionList = document.getElementById("position-list");
    if (!positionList) {
      console.error("Position list element not found!");
      return;
    }
    positionList.innerHTML = positions.map(position => {
      const currentCoin = coins.find(coin => coin.name === position.coin);
      const profitLoss = ((currentCoin.price - position.purchasePrice) / position.purchasePrice) * 100;
      const profitLossClass = profitLoss >= 0 ? 'up' : 'down';
      const dollarValue = (currentCoin.price * position.amount).toFixed(2);

      return `
        <div>
          <span>${position.coin}</span>
          <span>Amount: ${position.amount.toFixed(4)}</span>
          <span>Value: $${dollarValue}</span>
          <span>Profit/Loss: <span class="${profitLossClass}">${profitLoss.toFixed(2)}%</span></span>
        </div>
      `;
    }).join("");
  }

  // Faster price updates for a more dynamic trading experience
  setInterval(updateMarket, 500);
  setInterval(updateChart, 500);

  // Initialize everything after DOM is loaded
  initialize();
});