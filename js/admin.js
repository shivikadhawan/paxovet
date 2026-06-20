// PaxoVet Admin Console Operations Manager
window.PaxoAdmin = {
  activeApptId: null,   // Selected appt for recording treatment prescription
  rescheduleApptId: null,// Selected appt for rescheduling
  activeTab: 'dashboard',// Active dashboard sub-tab
  selectedDate: '',     // Selected slot date for slots scheduler calendar
  editingProductId: null, // Track product being edited (null = adding new)

  init: () => {
    PaxoAdmin.renderStats();
    PaxoAdmin.renderDashboardCharts();
    PaxoAdmin.renderActivityFeed();
    PaxoAdmin.setupSlotsCalendar();
    PaxoAdmin.renderSlots();
    PaxoAdmin.renderAppointments();
    PaxoAdmin.renderProducts();
    PaxoAdmin.renderOrders();
    PaxoAdmin.renderPayments();
    PaxoAdmin.renderNotifications();
  },

  // ==========================================
  // 🗂️ Admin Tab Switcher Control
  // ==========================================
  selectTab: (tabName, element) => {
    PaxoAdmin.activeTab = tabName;
    
    // Deactivate all admin tabs in DOM
    document.querySelectorAll('.admin-tab-content').forEach(el => {
      el.style.display = 'none';
    });
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Activate target admin tab
    const targetContent = document.getElementById(`admin-tab-${tabName}`);
    if (targetContent) targetContent.style.display = 'block';
    if (element) {
      element.classList.add('active');
    } else {
      // Find button by onclick pattern if navigating programmatically
      const btn = Array.from(document.querySelectorAll('.admin-tab-btn')).find(b => b.outerHTML.includes(`'${tabName}'`));
      if (btn) btn.classList.add('active');
    }

    // Trigger tab-specific renders to ensure live data
    if (tabName === 'dashboard') {
      PaxoAdmin.renderStats();
      PaxoAdmin.renderDashboardCharts();
      PaxoAdmin.renderActivityFeed();
    }
    if (tabName === 'slots') {
      PaxoAdmin.renderSlots();
    }
    if (tabName === 'appointments') {
      PaxoAdmin.renderAppointments();
    }
    if (tabName === 'products') {
      PaxoAdmin.renderProducts();
    }
    if (tabName === 'orders') {
      PaxoAdmin.renderOrders();
    }
    if (tabName === 'payments') {
      PaxoAdmin.renderPayments();
    }
  },

  // ==========================================
  // 🏢 Live Indicators Stats & KPIs
  // ==========================================
  renderStats: () => {
    const orders = PaxoDB.get('orders');
    const appointments = PaxoDB.get('appointments');
    const products = PaxoDB.get('products');
    const pets = PaxoDB.get('pets');
    const users = PaxoDB.get('users').filter(u => u.role === 'customer');

    // Revenue from paid store orders
    const revenue = orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0);

    // Appointments states
    const pendingAppts = appointments.filter(a => a.status === 'submitted').length;
    const approvedAppts = appointments.filter(a => a.status === 'approved').length;
    const completedAppts = appointments.filter(a => a.status === 'completed').length;

    // Low stock active products
    const lowStockCount = products.filter(p => p.stock <= 3 && p.status !== 'inactive').length;

    // DOM bindings
    const revEl = document.getElementById('admin-stat-revenue');
    if (revEl) revEl.textContent = `₹${revenue.toLocaleString('en-IN')}`;

    const custEl = document.getElementById('admin-stat-customers');
    if (custEl) custEl.textContent = users.length;

    const petEl = document.getElementById('admin-stat-pets');
    if (petEl) petEl.textContent = pets.length;

    const pendEl = document.getElementById('admin-stat-pending');
    if (pendEl) pendEl.textContent = pendingAppts;

    const apptEl = document.getElementById('admin-stat-approved');
    if (apptEl) apptEl.textContent = approvedAppts;

    const complEl = document.getElementById('admin-stat-completed');
    if (complEl) complEl.textContent = completedAppts;

    const ordersEl = document.getElementById('admin-stat-orders');
    if (ordersEl) ordersEl.textContent = orders.length;

    const stockEl = document.getElementById('admin-stat-stock');
    if (stockEl) stockEl.textContent = lowStockCount;

    // Render stock alerts list
    const alertsList = document.getElementById('admin-stock-alerts-list');
    if (alertsList) {
      const lowStockProducts = products.filter(p => p.stock <= 3 && p.status !== 'inactive');
      if (lowStockProducts.length === 0) {
        alertsList.innerHTML = `<li class="alert-item success">✅ All clinic and store products are fully stocked.</li>`;
      } else {
        alertsList.innerHTML = lowStockProducts.map(p => `
          <li class="alert-item danger">
            ⚠️ <strong>${p.name}</strong> is running low: <span style="font-weight: bold; color: var(--accent);">${p.stock} left</span> (${p.status.toUpperCase()}).
          </li>
        `).join('');
      }
    }
  },

  // ==========================================
  // 📊 SVG Charts & Analytics rendering
  // ==========================================
  renderDashboardCharts: () => {
    const orders = PaxoDB.get('orders').filter(o => o.paymentStatus === 'paid');
    const appointments = PaxoDB.get('appointments');

    // 1. Revenue trend: Last 7 Days (including today)
    const revChartContainer = document.getElementById('revenue-trend-chart');
    if (revChartContainer) {
      const dailyData = [];
      for (let i = 6; i >= 0; i--) {
        const dateStr = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const dayLabel = new Date(Date.now() - i * 86400000).getDate() + " " + monthsShort[new Date(Date.now() - i * 86400000).getMonth()];
        const dayRevenue = orders.filter(o => o.date.startsWith(dateStr)).reduce((sum, o) => sum + o.total, 0);
        dailyData.push({ label: dayLabel, value: dayRevenue });
      }

      const maxVal = Math.max(...dailyData.map(d => d.value), 1000);
      const barCount = dailyData.length;
      const svgWidth = 450;
      const svgHeight = 200;
      const padding = 30;
      const chartWidth = svgWidth - padding * 2;
      const chartHeight = svgHeight - padding * 2;
      const barWidth = (chartWidth / barCount) - 10;

      let svgContent = `<svg width="100%" height="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" style="font-family: inherit;">`;
      
      // Draw gridlines
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        const val = Math.round(maxVal - (maxVal / 4) * i);
        svgContent += `
          <line x1="${padding}" y1="${y}" x2="${svgWidth - padding}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <text x="${padding - 5}" y="${y + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">₹${val}</text>
        `;
      }

      // Draw bars
      dailyData.forEach((d, index) => {
        const x = padding + (chartWidth / barCount) * index + 5;
        const bHeight = (d.value / maxVal) * chartHeight;
        const y = padding + chartHeight - bHeight;
        svgContent += `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${bHeight}" fill="url(#blue-grad)" rx="4"/>
          <text x="${x + barWidth/2}" y="${y - 6}" fill="#FFF" font-size="9" font-weight="bold" text-anchor="middle">₹${d.value > 0 ? d.value.toLocaleString('en-IN') : '0'}</text>
          <text x="${x + barWidth/2}" y="${padding + chartHeight + 15}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${d.label}</text>
        `;
      });

      // Gradients definition
      svgContent += `
        <defs>
          <linearGradient id="blue-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="var(--secondary)"/>
            <stop offset="100%" stop-color="var(--primary)"/>
          </linearGradient>
        </defs>
      </svg>`;
      
      revChartContainer.innerHTML = svgContent;
    }

    // 2. Appointment Trend: Donut/Ring Chart
    const apptChartContainer = document.getElementById('appt-trend-chart');
    if (apptChartContainer) {
      const counts = {
        submitted: appointments.filter(a => a.status === 'submitted').length,
        approved: appointments.filter(a => a.status === 'approved').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length
      };

      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      
      // We will render visual horizontal bar rows for detailed breakdown
      apptChartContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; padding-top: 10px;">
          ${Object.entries(counts).map(([status, count]) => {
            const pct = Math.round((count / total) * 100);
            let color = 'var(--primary)';
            if (status === 'approved') color = 'var(--secondary)';
            if (status === 'completed') color = 'var(--success)';
            if (status === 'cancelled') color = 'var(--accent)';
            return `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                  <span style="text-transform: capitalize; font-weight: 500;">${status}</span>
                  <span style="font-weight: 700; color: ${color};">${count} (${pct}%)</span>
                </div>
                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 4px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 3. Product Sales bestsellers chart
    const prodChartContainer = document.getElementById('prod-sales-chart');
    if (prodChartContainer) {
      const salesMap = {};
      orders.forEach(ord => {
        ord.items.forEach(item => {
          salesMap[item.name] = (salesMap[item.name] || 0) + item.qty;
        });
      });

      const sortedProducts = Object.entries(salesMap)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 4);

      if (sortedProducts.length === 0) {
        prodChartContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 24px; font-style: italic;">No product checkout sales logs recorded yet.</p>`;
      } else {
        const maxQty = Math.max(...sortedProducts.map(p => p.qty), 1);
        prodChartContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 14px; padding-top: 10px;">
            ${sortedProducts.map(p => {
              const pct = (p.qty / maxQty) * 100;
              return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-weight: 500;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;" title="${p.name}">${p.name}</span>
                    <span style="font-weight: bold; color: var(--secondary);">${p.qty} sold</span>
                  </div>
                  <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.06); border-radius: 5px; overflow: hidden;">
                    <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 5px;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }
  },

  // ==========================================
  // ⚡ Recent Activities compiler feed
  // ==========================================
  renderActivityFeed: () => {
    const appointments = PaxoDB.get('appointments');
    const orders = PaxoDB.get('orders');
    const treatments = PaxoDB.get('treatments');
    const pets = PaxoDB.get('pets');
    
    const activities = [];

    // Map bookings
    appointments.forEach(appt => {
      const pet = pets.find(p => p.id === appt.pet_id) || { name: 'Pet' };
      const date = new Date(appt.datetime);
      let desc = `New consultation request submitted for pet ${pet.name}.`;
      let type = 'booking';
      let icon = '📅';
      if (appt.status === 'approved') {
        desc = `Consultation booking approved for ${pet.name}.`;
      } else if (appt.status === 'completed') {
        desc = `Appointment finished for pet ${pet.name}.`;
      } else if (appt.status === 'cancelled') {
        desc = `Booking request rejected/cancelled for ${pet.name}.`;
      }

      activities.push({
        icon,
        desc,
        date,
        type
      });
    });

    // Map store purchases
    orders.forEach(ord => {
      let desc = `Order checkout received total: ₹${ord.total.toLocaleString('en-IN')}.`;
      let type = 'purchase';
      let icon = '🛍️';
      if (ord.paymentStatus === 'refunded') {
        desc = `Order refund issued successfully: ₹${ord.total.toLocaleString('en-IN')}.`;
        icon = '🔄';
      }
      activities.push({
        icon,
        desc,
        date: new Date(ord.date),
        type
      });
    });

    // Sort chronologically (latest first)
    activities.sort((a, b) => b.date - a.date);

    const feedList = document.getElementById('admin-activity-feed');
    if (feedList) {
      if (activities.length === 0) {
        feedList.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 16px; font-style: italic;">No activities recorded.</li>`;
        return;
      }
      feedList.innerHTML = activities.slice(0, 5).map(act => {
        const timeDiff = Date.now() - act.date.getTime();
        let relativeTime = 'Just now';
        if (timeDiff > 60000) {
          const mins = Math.round(timeDiff / 60000);
          if (mins < 60) relativeTime = `${mins}m ago`;
          else {
            const hrs = Math.round(mins / 60);
            if (hrs < 24) relativeTime = `${hrs}h ago`;
            else relativeTime = `${Math.round(hrs / 24)}d ago`;
          }
        }
        return `
          <li class="activity-item" style="display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
            <span style="font-size: 18px; margin-top: 2px;">${act.icon}</span>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 13px; font-weight: 500;">${act.desc}</p>
              <span style="font-size: 11px; color: var(--text-muted);">${relativeTime}</span>
            </div>
          </li>
        `;
      }).join('');
    }
  },

  // ==========================================
  // 📅 Slots Manager Control (extended)
  // ==========================================
  setupSlotsCalendar: () => {
    const container = document.getElementById('admin-slots-dates-row');
    if (!container) return;

    const dates = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        dayString: weekdays[d.getDay()],
        dateNum: d.getDate(),
        fullIso: d.toISOString().split('T')[0]
      });
    }

    if (!PaxoAdmin.selectedDate) {
      PaxoAdmin.selectedDate = dates[0].fullIso;
    }

    container.innerHTML = dates.map(d => `
      <div class="calendar-date-card ${PaxoAdmin.selectedDate === d.fullIso ? 'active' : ''}" data-date="${d.fullIso}" onclick="PaxoAdmin.selectSlotsDate('${d.fullIso}', this)">
        <span class="day-lbl">${d.dayString}</span>
        <span class="date-num">${d.dateNum}</span>
      </div>
    `).join('');
  },

  selectSlotsDate: (dateIso, element) => {
    PaxoAdmin.selectedDate = dateIso;
    document.querySelectorAll('#admin-slots-dates-row .calendar-date-card').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    PaxoAdmin.renderSlots();
  },

  renderSlots: () => {
    const slots = PaxoDB.get('slots')
      .filter(s => s.date === PaxoAdmin.selectedDate)
      .sort((a, b) => PaxoAdmin.parseTimeToMinutes(a.startTime) - PaxoAdmin.parseTimeToMinutes(b.startTime));
    
    const slotsList = document.getElementById('admin-slots-list');
    if (!slotsList) return;

    if (slots.length === 0) {
      slotsList.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 24px; font-style: italic;">No appointment slots scheduled for this date.</p>`;
      return;
    }

    slotsList.innerHTML = slots.map(slot => {
      const occupancyPct = Math.min((slot.bookedCount / slot.maxBookings) * 100, 100);
      let badgeColor = 'badge-info';
      if (slot.status === 'full') badgeColor = 'badge-warning';
      if (slot.status === 'closed') badgeColor = 'badge-danger';

      return `
        <div class="slot-list-item" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 16px; background: rgba(30,41,59,0.3); border: 1px solid var(--border-color); border-radius: var(--rounded-md);">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <span style="font-weight: bold; font-size: 15px;">⏰ ${slot.startTime} - ${slot.endTime}</span>
              <span class="badge ${badgeColor}" style="margin-left: 10px;">${slot.status.toUpperCase()}</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm btn-outline" style="padding: 4px 10px; font-size: 11px;" onclick="PaxoAdmin.toggleSlotStatus('${slot.id}')">Toggle Status</button>
              <button class="btn btn-sm btn-danger-outline" style="padding: 4px 10px; font-size: 11px;" onclick="PaxoAdmin.deleteSlot('${slot.id}')">Remove</button>
            </div>
          </div>
          <div style="width: 100%; margin-top: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">
              <span>Occupancy:</span>
              <span style="font-weight: 600;">${slot.bookedCount} / ${slot.maxBookings} bookings</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
              <div style="width: ${occupancyPct}%; height: 100%; background: var(--secondary); border-radius: 3px;"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  parseTimeToMinutes: (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return 0;
    const [time, modifier] = parts;
    const timeParts = time.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1] || '0');
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  },

  checkOverlapping: (date, startTime, endTime, skipSlotId = null) => {
    const slots = PaxoDB.get('slots').filter(s => s.date === date && s.id !== skipSlotId);
    const newStart = PaxoAdmin.parseTimeToMinutes(startTime);
    const newEnd = PaxoAdmin.parseTimeToMinutes(endTime);

    if (newStart >= newEnd) {
      return 'Start time must be before end time.';
    }

    const overlap = slots.some(s => {
      const start = PaxoAdmin.parseTimeToMinutes(s.startTime);
      const end = PaxoAdmin.parseTimeToMinutes(s.endTime);
      return Math.max(newStart, start) < Math.min(newEnd, end);
    });

    return overlap ? 'Timeslot overlaps with an existing schedule opening.' : null;
  },

  createSlot: (event) => {
    event.preventDefault();
    const date = document.getElementById('admin-slot-date').value;
    const startTime = document.getElementById('admin-slot-start-time').value;
    const endTime = document.getElementById('admin-slot-end-time').value;
    const maxBookings = parseInt(document.getElementById('admin-slot-max-bookings').value) || 1;

    if (!date || !startTime || !endTime) {
      PaxoUtils.toast('Date, start time, and end time are required.', 'error');
      return;
    }

    const overlapErr = PaxoAdmin.checkOverlapping(date, startTime, endTime);
    if (overlapErr) {
      PaxoUtils.toast(overlapErr, 'error');
      return;
    }

    const newSlot = {
      id: PaxoUtils.uuid('slot'),
      date: date,
      startTime: startTime,
      endTime: endTime,
      maxBookings: maxBookings,
      bookedCount: 0,
      status: 'open'
    };

    PaxoDB.insert('slots', newSlot);
    PaxoUtils.toast(`Opened timeslot for ${PaxoUtils.formatFullDate(date)}!`, 'success');
    
    // Refresh
    PaxoAdmin.renderSlots();
    if (window.PaxoCustomer) window.PaxoCustomer.renderAvailableSlots();
  },

  bulkCreateSlots: (event) => {
    event.preventDefault();
    const startDateStr = document.getElementById('admin-bulk-start-date').value;
    const endDateStr = document.getElementById('admin-bulk-end-date').value;
    const maxBookings = parseInt(document.getElementById('admin-bulk-max-bookings').value) || 1;

    // Read checked patterns
    const checkedTimes = Array.from(document.querySelectorAll('.admin-bulk-time-checkbox:checked'))
      .map(checkbox => {
        const start = checkbox.value;
        const end = checkbox.getAttribute('data-end');
        return { start, end };
      });

    if (!startDateStr || !endDateStr) {
      PaxoUtils.toast('Start and End dates are required.', 'error');
      return;
    }

    if (checkedTimes.length === 0) {
      PaxoUtils.toast('Please select at least one timeslot pattern.', 'error');
      return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (startDate > endDate) {
      PaxoUtils.toast('Start date cannot be after end date.', 'error');
      return;
    }

    let createdCount = 0;
    let overlapCount = 0;

    // Loop through dates
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateIso = current.toISOString().split('T')[0];
      
      checkedTimes.forEach(t => {
        const overlapErr = PaxoAdmin.checkOverlapping(dateIso, t.start, t.end);
        if (overlapErr) {
          overlapCount++;
        } else {
          const newSlot = {
            id: PaxoUtils.uuid('slot'),
            date: dateIso,
            startTime: t.start,
            endTime: t.end,
            maxBookings: maxBookings,
            bookedCount: 0,
            status: 'open'
          };
          PaxoDB.insert('slots', newSlot);
          createdCount++;
        }
      });

      current.setDate(current.getDate() + 1);
    }

    if (createdCount > 0) {
      PaxoUtils.toast(`Bulk generated ${createdCount} timeslot openings!`, 'success');
    }
    if (overlapCount > 0) {
      PaxoUtils.toast(`Skipped ${overlapCount} slots due to overlapping hours.`, 'info');
    }

    PaxoAdmin.renderSlots();
    if (window.PaxoCustomer) window.PaxoCustomer.renderAvailableSlots();
  },

  toggleSlotStatus: (slotId) => {
    const slots = PaxoDB.get('slots');
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    let newStatus = 'open';
    if (slot.status === 'open') {
      newStatus = 'closed';
    } else if (slot.status === 'closed') {
      newStatus = slot.bookedCount >= slot.maxBookings ? 'full' : 'open';
    } else if (slot.status === 'full') {
      newStatus = 'closed';
    }

    PaxoDB.update('slots', s => s.id === slotId, () => ({ status: newStatus }));
    PaxoUtils.toast(`Slot status updated to ${newStatus.toUpperCase()}`, 'success');
    PaxoAdmin.renderSlots();
  },

  deleteSlot: (slotId) => {
    const slot = PaxoDB.get('slots').find(s => s.id === slotId);
    if (!slot) return;
    if (slot.bookedCount > 0) {
      PaxoUtils.toast('Cannot delete a slot that already has scheduled appointments.', 'error');
      return;
    }
    if (confirm('Are you sure you want to delete this availability timeslot?')) {
      PaxoDB.delete('slots', s => s.id === slotId);
      PaxoUtils.toast('Timeslot removed.', 'info');
      PaxoAdmin.renderSlots();
      if (window.PaxoCustomer) window.PaxoCustomer.renderAvailableSlots();
    }
  },

  // ==========================================
  // 🐶 Bookings Approvals & Appointments (extended)
  // ==========================================
  renderAppointments: () => {
    const appts = PaxoDB.get('appointments');
    const pets = PaxoDB.get('pets');
    const users = PaxoDB.get('users');
    const listContainer = document.getElementById('admin-bookings-list');

    if (!listContainer) return;

    // Filters and search values
    const query = (document.getElementById('admin-appt-search') || { value: '' }).value.toLowerCase().trim();
    const filterTab = document.querySelector('.admin-appt-filter-btn.active')?.getAttribute('data-filter') || 'all';

    let filtered = appts;

    // Search query filter
    if (query) {
      filtered = appts.filter(appt => {
        const pet = pets.find(p => p.id === appt.pet_id) || {};
        const owner = users.find(u => u.id === pet.owner_id) || {};
        return (pet.name && pet.name.toLowerCase().includes(query)) ||
               (owner.email && owner.email.toLowerCase().includes(query));
      });
    }

    // Tab filter
    const todayStr = new Date().toISOString().split('T')[0];
    if (filterTab === 'today') {
      filtered = filtered.filter(a => a.datetime.startsWith(todayStr));
    } else if (filterTab === 'upcoming') {
      filtered = filtered.filter(a => new Date(a.datetime) >= new Date() && a.status !== 'completed' && a.status !== 'cancelled');
    } else if (filterTab === 'completed') {
      filtered = filtered.filter(a => a.status === 'completed');
    }

    // Sort: upcoming first
    filtered.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 32px; text-align: center;">
          <span style="font-size: 32px;">🔍</span>
          <p style="color: var(--text-muted); margin-top: 8px;">No scheduled appointments found matching search criteria.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(appt => {
      const pet = pets.find(p => p.id === appt.pet_id) || { name: 'Furry Friend', species: 'Dog', breed: 'Mixed' };
      const owner = users.find(u => u.id === pet.owner_id) || { name: 'Aryan Sharma', email: 'aryan@customer.com', phone: '+919876543210' };
      const dateObj = new Date(appt.datetime);
      
      let badgeClass = 'badge-info';
      if (appt.status === 'approved') badgeClass = 'badge-success';
      if (appt.status === 'completed') badgeClass = 'badge-outline';
      if (appt.status === 'cancelled') badgeClass = 'badge-danger';
      if (appt.status === 'in_progress') badgeClass = 'badge-warning';

      return `
        <div class="glass-card admin-appt-card" style="margin-bottom: 16px;">
          <div class="admin-appt-header">
            <div>
              <h4 style="margin: 0; color: var(--primary);">${pet.name} (${pet.species})</h4>
              <span style="font-size: 12px; color: var(--text-muted);">Breed: ${pet.breed || 'Mixed'} | Owner: ${owner.name} (${owner.email})</span>
            </div>
            <span class="badge ${badgeClass}">${appt.status.toUpperCase()}</span>
          </div>
          <p style="margin: 8px 0; font-size: 14px; font-weight: 500;">
            📅 ${PaxoUtils.formatDate(dateObj)} at ${PaxoUtils.formatTime(dateObj)}
          </p>
          <p style="margin: 0 0 12px; font-size: 13px; color: var(--text-muted);">
            <strong>Reason:</strong> "${appt.reason}"
          </p>
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${appt.status === 'submitted' ? `
              <button class="btn btn-sm btn-primary" onclick="PaxoAdmin.updateApptStatus('${appt.id}', 'approved')">Approve</button>
              <button class="btn btn-sm btn-danger-outline" onclick="PaxoAdmin.updateApptStatus('${appt.id}', 'cancelled')">Reject</button>
            ` : ''}
            ${appt.status === 'approved' ? `
              <button class="btn btn-sm btn-primary" onclick="PaxoAdmin.updateApptStatus('${appt.id}', 'in_progress')">Mark Check-in 🏥</button>
            ` : ''}
            ${appt.status === 'in_progress' ? `
              <button class="btn btn-sm btn-primary" onclick="PaxoAdmin.openTreatmentModal('${appt.id}')">Add Diagnosis & Complete 💊</button>
            ` : ''}
            ${appt.status !== 'completed' && appt.status !== 'cancelled' ? `
              <button class="btn btn-sm btn-outline" onclick="PaxoAdmin.openRescheduleModal('${appt.id}')">Reschedule</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  updateApptStatus: (apptId, status) => {
    const appts = PaxoDB.get('appointments');
    const appt = appts.find(a => a.id === apptId);
    if (!appt) return;

    PaxoDB.update('appointments', a => a.id === apptId, () => ({ status: status }));

    // If cancelled, decrement slot occupancy
    if (status === 'cancelled') {
      const slotDate = appt.datetime.split('T')[0];
      const slotTime = PaxoUtils.formatTime(new Date(appt.datetime));
      
      const slots = PaxoDB.get('slots');
      const matchingSlot = slots.find(s => s.date === slotDate && (s.startTime === slotTime || s.startTime.includes(slotTime.substring(0,5))));
      if (matchingSlot) {
        const newCount = Math.max(matchingSlot.bookedCount - 1, 0);
        PaxoDB.update('slots', s => s.id === matchingSlot.id, () => ({ 
          bookedCount: newCount,
          status: newCount >= matchingSlot.maxBookings ? 'full' : 'open'
        }));
      }
      PaxoAdmin.logNotification('appt_cancelled', 'Appointment Cancelled', `Booking cancelled for pet id ${appt.pet_id}.`);
    } else if (status === 'approved') {
      PaxoAdmin.logNotification('appt_approved', 'Appointment Approved', `Appointment approved for pet id ${appt.pet_id}.`);
    }

    PaxoUtils.toast(`Appointment marked as ${status.toUpperCase()}.`, 'success');
    PaxoAdmin.renderAppointments();
    PaxoAdmin.renderStats();
    PaxoAdmin.renderActivityFeed();
    if (window.PaxoCustomer) window.PaxoCustomer.renderBookings();
  },

  // ==========================================
  // Reschedule Modal Operations
  // ==========================================
  openRescheduleModal: (apptId) => {
    PaxoAdmin.rescheduleApptId = apptId;
    const modal = document.getElementById('reschedule-modal');
    if (!modal) return;

    // Render future open slots list in modal
    const slots = PaxoDB.get('slots').filter(s => s.status === 'open' && s.bookedCount < s.maxBookings && new Date(s.date) >= new Date().setHours(0,0,0,0));
    const select = document.getElementById('reschedule-slot-select');
    if (select) {
      if (slots.length === 0) {
        select.innerHTML = `<option value="">No open timeslots available in database. Create more slots first.</option>`;
      } else {
        select.innerHTML = slots.map(s => `
          <option value="${s.id}">${PaxoUtils.formatFullDate(s.date)}: ${s.startTime} - ${s.endTime} (${s.bookedCount}/${s.maxBookings} booked)</option>
        `).join('');
      }
    }

    modal.style.display = 'flex';
  },

  hideRescheduleModal: () => {
    const modal = document.getElementById('reschedule-modal');
    if (modal) modal.style.display = 'none';
  },

  submitReschedule: (event) => {
    event.preventDefault();
    const select = document.getElementById('reschedule-slot-select');
    const slotId = select.value;
    if (!slotId) {
      PaxoUtils.toast('Please select a valid reschedule slot.', 'error');
      return;
    }

    const appt = PaxoDB.get('appointments').find(a => a.id === PaxoAdmin.rescheduleApptId);
    const newSlot = PaxoDB.get('slots').find(s => s.id === slotId);
    if (!appt || !newSlot) return;

    // 1. Release old slot count
    const oldDate = appt.datetime.split('T')[0];
    const oldTime = PaxoUtils.formatTime(new Date(appt.datetime));
    const oldSlot = PaxoDB.get('slots').find(s => s.date === oldDate && s.startTime.includes(oldTime.substring(0, 5)));
    if (oldSlot) {
      const newCount = Math.max(oldSlot.bookedCount - 1, 0);
      PaxoDB.update('slots', s => s.id === oldSlot.id, () => ({
        bookedCount: newCount,
        status: newCount >= oldSlot.maxBookings ? 'full' : 'open'
      }));
    }

    // 2. Consume new slot count
    const updatedBookedCount = newSlot.bookedCount + 1;
    PaxoDB.update('slots', s => s.id === slotId, () => ({
      bookedCount: updatedBookedCount,
      status: updatedBookedCount >= newSlot.maxBookings ? 'full' : 'open'
    }));

    // 3. Update appointment date/time
    let hourPart = "11:00:00";
    if (newSlot.startTime.includes('09:30')) hourPart = "09:30:00";
    if (newSlot.startTime.includes('11:00')) hourPart = "11:00:00";
    if (newSlot.startTime.includes('12:30')) hourPart = "12:30:00";
    if (newSlot.startTime.includes('03:00')) hourPart = "15:00:00";
    if (newSlot.startTime.includes('04:30')) hourPart = "16:30:00";
    if (newSlot.startTime.includes('06:00')) hourPart = "18:00:00";
    const newDatetime = `${newSlot.date}T${hourPart}Z`;

    PaxoDB.update('appointments', a => a.id === PaxoAdmin.rescheduleApptId, () => ({
      datetime: newDatetime,
      status: 'approved'
    }));

    PaxoUtils.toast('Appointment rescheduled successfully!', 'success');
    PaxoAdmin.hideRescheduleModal();
    PaxoAdmin.renderAppointments();
    PaxoAdmin.renderActivityFeed();
    if (window.PaxoCustomer) {
      window.PaxoCustomer.renderBookings();
      window.PaxoCustomer.renderAvailableSlots();
    }
  },

  // ==========================================
  // 💊 Treatment / Medical Recorder (extended)
  // ==========================================
  medicationsList: [], 

  openTreatmentModal: (apptId) => {
    const modal = document.getElementById('treatment-modal');
    if (!modal) return;

    PaxoAdmin.activeApptId = apptId;
    PaxoAdmin.medicationsList = [];
    document.getElementById('admin-meds-compiler-list').innerHTML = '';

    const appt = PaxoDB.get('appointments').find(a => a.id === apptId);
    const pet = PaxoDB.get('pets').find(p => p.id === appt.pet_id) || { name: 'Bruno' };

    const titleEl = document.getElementById('treatment-modal-title');
    if (titleEl) titleEl.textContent = `Write Treatment Prescription for ${pet.name}`;

    document.getElementById('admin-diagnosis').value = '';
    document.getElementById('admin-treatment-notes').value = '';
    document.getElementById('admin-treatment-prescription').value = '';
    document.getElementById('admin-treatment-followup').value = getIsoDateString(7); // default 7 days

    modal.style.display = 'flex';
  },

  hideTreatmentModal: () => {
    const modal = document.getElementById('treatment-modal');
    if (modal) modal.style.display = 'none';
  },

  addMedicine: () => {
    const nameInput = document.getElementById('admin-med-name');
    const dosageInput = document.getElementById('admin-med-dosage');
    const daysInput = document.getElementById('admin-med-days');

    const name = nameInput.value.trim();
    const dosage = dosageInput.value.trim();
    const days = parseInt(daysInput.value) || 1;

    if (!name || !dosage) {
      PaxoUtils.toast('Please enter medicine name and dosage instructions.', 'error');
      return;
    }

    const item = { name, dosage, days };
    PaxoAdmin.medicationsList.push(item);

    nameInput.value = '';
    dosageInput.value = '';
    daysInput.value = '5';

    const listEl = document.getElementById('admin-meds-compiler-list');
    listEl.innerHTML = PaxoAdmin.medicationsList.map((m, index) => `
      <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 6px 0;">
        <span>💊 <strong>${m.name}</strong> - ${m.dosage}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--secondary);">${m.days} days</span>
          <span style="cursor: pointer; color: var(--accent);" onclick="PaxoAdmin.removeMedicine(${index})">✕</span>
        </div>
      </div>
    `).join('');
  },

  removeMedicine: (index) => {
    PaxoAdmin.medicationsList.splice(index, 1);
    const listEl = document.getElementById('admin-meds-compiler-list');
    listEl.innerHTML = PaxoAdmin.medicationsList.map((m, idx) => `
      <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 6px 0;">
        <span>💊 <strong>${m.name}</strong> - ${m.dosage}</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--secondary);">${m.days} days</span>
          <span style="cursor: pointer; color: var(--accent);" onclick="PaxoAdmin.removeMedicine(${idx})">✕</span>
        </div>
      </div>
    `).join('');
  },

  saveTreatment: (event) => {
    event.preventDefault();
    const diagnosis = document.getElementById('admin-diagnosis').value.trim();
    const notes = document.getElementById('admin-treatment-notes').value.trim();
    const prescription = document.getElementById('admin-treatment-prescription').value.trim();
    const followUpDate = document.getElementById('admin-treatment-followup').value;

    if (!diagnosis) {
      PaxoUtils.toast('Diagnosis description is required.', 'error');
      return;
    }

    const appt = PaxoDB.get('appointments').find(a => a.id === PaxoAdmin.activeApptId);
    if (!appt) return;

    const newTreatment = {
      id: PaxoUtils.uuid('treat'),
      pet_id: appt.pet_id,
      date: new Date().toISOString().split('T')[0],
      diagnosis: diagnosis,
      medicines: PaxoAdmin.medicationsList,
      notes: notes,
      prescription: prescription,
      followUpDate: followUpDate || null,
      doctor_name: 'Dr. Vikram Patel'
    };

    // 1. Insert treatment prescription record
    PaxoDB.insert('treatments', newTreatment);

    // 2. Mark appointment status as completed
    PaxoDB.update('appointments', a => a.id === PaxoAdmin.activeApptId, () => ({ status: 'completed' }));

    // Auto-close matching slot status
    const slotDate = appt.datetime.split('T')[0];
    const slotTime = PaxoUtils.formatTime(new Date(appt.datetime));
    const slot = PaxoDB.get('slots').find(s => s.date === slotDate && s.startTime.includes(slotTime.substring(0, 5)));
    if (slot) {
      PaxoDB.update('slots', s => s.id === slot.id, () => ({ status: 'closed' }));
    }

    PaxoUtils.toast('Prescription details saved and appointment completed!', 'success');
    PaxoAdmin.logNotification('treatment_completed', 'Treatment Prescribed', `Diagnostics recorded for pet id ${appt.pet_id}.`);
    
    PaxoAdmin.hideTreatmentModal();
    PaxoAdmin.renderAppointments();
    PaxoAdmin.renderStats();
    PaxoAdmin.renderActivityFeed();
    if (window.PaxoCustomer) {
      window.PaxoCustomer.renderBookings();
      window.PaxoCustomer.renderHistory();
      window.PaxoCustomer.renderAvailableSlots();
    }
  },

  // ==========================================
  // 🛍️ Store Products Inventory Manager (extended)
  // ==========================================
  renderProducts: () => {
    const products = PaxoDB.get('products');
    const listContainer = document.getElementById('admin-products-list');
    if (!listContainer) return;

    if (products.length === 0) {
      listContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 16px;">No products in store catalog.</p>`;
      return;
    }

    listContainer.innerHTML = products.map(prod => `
      <div class="admin-product-item" style="margin-bottom: 12px;">
        <div class="admin-product-info">
          <img src="${prod.image_url}" alt="${prod.name}">
          <div>
            <h5 style="margin: 0; font-size: 15px;">${prod.name}</h5>
            <span style="font-size: 12px; color: var(--text-muted);">
              Price: ₹${prod.price.toLocaleString('en-IN')} | Discount: ${prod.discount}% | Cat: ${prod.category}
            </span>
            <div style="font-size: 11px; margin-top: 4px;">
              <span class="badge ${prod.status === 'active' ? 'badge-success' : 'badge-danger'}">${prod.status.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div class="stock-control" style="flex-wrap: wrap; justify-content: flex-end;">
          <span style="font-size: 13px; font-weight: 600; color: ${prod.stock <= 3 ? 'var(--accent)' : 'var(--success)'};">Qty:</span>
          <input type="number" class="stock-qty-input" value="${prod.stock}" min="0" onchange="PaxoAdmin.updateProductStock('${prod.id}', this.value)">
          <button class="btn btn-sm btn-outline" style="padding: 4px 10px; font-size: 11px;" onclick="PaxoAdmin.editProduct('${prod.id}')">Edit</button>
          <button class="btn btn-sm btn-danger-outline" style="padding: 4px 10px; font-size: 11px;" onclick="PaxoAdmin.deleteProduct('${prod.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  },

  updateProductStock: (productId, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) {
      PaxoUtils.toast('Please enter a valid stock level quantity.', 'error');
      return;
    }
    
    let prodStatus = qty === 0 ? 'out_of_stock' : 'active';
    const oldProduct = PaxoDB.get('products').find(p => p.id === productId);
    if (oldProduct && oldProduct.status === 'inactive') {
      prodStatus = 'inactive';
    }

    PaxoDB.update('products', p => p.id === productId, () => ({ 
      stock: qty,
      status: prodStatus
    }));

    if (qty <= 3 && prodStatus !== 'inactive') {
      PaxoAdmin.logNotification('low_stock', 'Low Stock Alert', `${oldProduct.name} has low inventory remaining (${qty} left).`);
    }

    PaxoUtils.toast('Stock quantity level updated.', 'success');
    PaxoAdmin.renderStats();
    PaxoAdmin.renderProducts();
    if (window.PaxoStore) window.PaxoStore.renderStore();
  },

  editProduct: (productId) => {
    const product = PaxoDB.get('products').find(p => p.id === productId);
    if (!product) return;

    PaxoAdmin.editingProductId = productId;
    document.getElementById('admin-prod-form-title').textContent = 'Edit Product Catalog Item';
    document.getElementById('admin-prod-name').value = product.name;
    document.getElementById('admin-prod-price').value = product.price;
    document.getElementById('admin-prod-stock').value = product.stock;
    document.getElementById('admin-prod-discount').value = product.discount || 0;
    document.getElementById('admin-prod-category').value = product.category;
    document.getElementById('admin-prod-image').value = product.image_url;
    document.getElementById('admin-prod-desc').value = product.description;
    
    // Create toggle field for status if not present or select values
    let selectStatus = document.getElementById('admin-prod-status');
    if (!selectStatus) {
      const group = document.createElement('div');
      group.className = 'form-group';
      group.innerHTML = `
        <label for="admin-prod-status">Status</label>
        <select id="admin-prod-status" class="form-control">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      `;
      const form = document.getElementById('admin-product-form');
      form.insertBefore(group, form.lastElementChild);
      selectStatus = document.getElementById('admin-prod-status');
    }
    if (selectStatus) selectStatus.value = product.status === 'inactive' ? 'inactive' : 'active';
  },

  deleteProduct: (productId) => {
    if (confirm('Are you sure you want to remove this product from the store catalog?')) {
      PaxoDB.delete('products', p => p.id === productId);
      PaxoUtils.toast('Product removed from catalog.', 'success');
      PaxoAdmin.renderProducts();
      PaxoAdmin.renderStats();
      if (window.PaxoStore) window.PaxoStore.renderStore();
    }
  },

  addProduct: (event) => {
    event.preventDefault();
    const name = document.getElementById('admin-prod-name').value.trim();
    const price = parseFloat(document.getElementById('admin-prod-price').value);
    const stock = parseInt(document.getElementById('admin-prod-stock').value);
    const discount = parseInt(document.getElementById('admin-prod-discount')?.value || '0');
    const category = document.getElementById('admin-prod-category').value;
    const desc = document.getElementById('admin-prod-desc').value.trim();
    const image = document.getElementById('admin-prod-image').value;
    const formStatus = document.getElementById('admin-prod-status')?.value || 'active';

    if (!name || isNaN(price) || isNaN(stock)) {
      PaxoUtils.toast('Product name, price and stock are required.', 'error');
      return;
    }

    const payload = {
      name: name,
      price: price,
      stock: stock,
      discount: discount,
      category: category,
      description: desc,
      image_url: image,
      status: stock === 0 && formStatus === 'active' ? 'out_of_stock' : formStatus
    };

    if (PaxoAdmin.editingProductId) {
      // Edit mode
      PaxoDB.update('products', p => p.id === PaxoAdmin.editingProductId, () => payload);
      PaxoUtils.toast(`${name} updated in store catalog!`, 'success');
      PaxoAdmin.editingProductId = null;
      document.getElementById('admin-prod-form-title').textContent = 'Add New Product to Store';
    } else {
      // Create mode
      const newProd = {
        id: PaxoUtils.uuid('prod'),
        ...payload
      };
      PaxoDB.insert('products', newProd);
      PaxoUtils.toast(`${name} added to store catalog!`, 'success');
    }

    // Reset Form
    document.getElementById('admin-product-form').reset();
    
    // Clear product status dropdown if injected
    const statusGroup = document.getElementById('admin-prod-status')?.closest('.form-group');
    if (statusGroup) statusGroup.remove();

    PaxoAdmin.renderProducts();
    PaxoAdmin.renderStats();
    if (window.PaxoStore) window.PaxoStore.renderStore();
  },

  // ==========================================
  // 📦 Orders Management Section (extended)
  // ==========================================
  renderOrders: () => {
    const orders = PaxoDB.get('orders').sort((a, b) => new Date(b.date) - new Date(a.date));
    const users = PaxoDB.get('users');
    const ordersList = document.getElementById('admin-orders-list');
    if (!ordersList) return;

    if (orders.length === 0) {
      ordersList.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 24px; font-style: italic;">No orders placed in catalog yet.</p>`;
      return;
    }

    ordersList.innerHTML = orders.map(ord => {
      const customer = users.find(u => u.id === ord.user_id) || { name: 'Aryan Sharma', email: 'aryan@customer.com' };
      const dateStr = PaxoUtils.formatFullDate(ord.date);
      const itemsListStr = ord.items.map(item => `<li>📦 ${item.name} <span style="font-weight: bold; color: var(--secondary);">x${item.qty}</span></li>`).join('');

      let pBadge = 'badge-info';
      if (ord.paymentStatus === 'paid') pBadge = 'badge-success';
      if (ord.paymentStatus === 'failed') pBadge = 'badge-danger';
      if (ord.paymentStatus === 'refunded') pBadge = 'badge-warning';

      let oBadge = 'badge-info';
      if (ord.orderStatus === 'delivered') oBadge = 'badge-success';
      if (ord.orderStatus === 'cancelled') oBadge = 'badge-danger';
      if (ord.orderStatus === 'shipped') oBadge = 'badge-warning';

      return `
        <div class="glass-card" style="margin-bottom: 20px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
            <div>
              <span style="font-family: monospace; font-size: 13px; font-weight: bold; color: var(--secondary);">${ord.id}</span>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Placed: ${dateStr}</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span>Payment: <span class="badge ${pBadge}">${ord.paymentStatus.toUpperCase()}</span></span>
              <span>Order: <span class="badge ${oBadge}">${ord.orderStatus.toUpperCase()}</span></span>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 16px;">
            <div>
              <span class="sec-lbl">Customer</span>
              <div style="font-weight: bold; font-size: 14px;">${customer.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${customer.email}</div>
            </div>
            <div>
              <span class="sec-lbl">Purchased Items</span>
              <ul style="margin: 0; padding-left: 16px; font-size: 13px; list-style-type: square;">
                ${itemsListStr}
              </ul>
            </div>
            <div>
              <span class="sec-lbl">Grand Total</span>
              <div style="font-size: 20px; font-weight: 800; color: var(--success);">₹${ord.total.toLocaleString('en-IN')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">Subtotal: ₹${ord.subtotal.toLocaleString('en-IN')} | GST: ₹${ord.tax.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 14px;">
            ${ord.orderStatus !== 'delivered' && ord.orderStatus !== 'cancelled' ? `
              <div style="display: flex; align-items: center; gap: 8px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-muted);">Change Status:</label>
                <select class="form-control" style="width: 140px; padding: 6px 10px; font-size: 12px;" onchange="PaxoAdmin.updateOrderStatus('${ord.id}', this.value)">
                  <option value="">-- select status --</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <button class="btn btn-sm btn-danger-outline" onclick="PaxoAdmin.cancelOrder('${ord.id}')">Cancel Order</button>
            ` : ''}
            ${ord.paymentStatus === 'paid' ? `
              <button class="btn btn-sm btn-danger-outline" onclick="PaxoAdmin.refundOrder('${ord.id}')">Issue Refund</button>
            ` : ''}
            <button class="btn btn-sm btn-outline" onclick="PaxoAdmin.openInvoiceModal('${ord.id}')">Print Invoice 📄</button>
          </div>
        </div>
      `;
    }).join('');
  },

  updateOrderStatus: (orderId, newStatus) => {
    if (!newStatus) return;
    PaxoDB.update('orders', o => o.id === orderId, () => ({ orderStatus: newStatus }));
    PaxoUtils.toast(`Order Status updated to ${newStatus.toUpperCase()}`, 'success');
    PaxoAdmin.renderOrders();
    PaxoAdmin.renderActivityFeed();
  },

  cancelOrder: (orderId) => {
    if (confirm('Are you sure you want to cancel this order? Item stock levels will be restored.')) {
      const ord = PaxoDB.get('orders').find(o => o.id === orderId);
      if (!ord) return;

      // Restore stocks
      const products = PaxoDB.get('products');
      ord.items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          prod.stock += item.qty;
          if (prod.status === 'out_of_stock' && prod.stock > 0) {
            prod.status = 'active';
          }
        }
      });
      PaxoDB.save('products', products);

      // Update Order
      PaxoDB.update('orders', o => o.id === orderId, () => ({ 
        orderStatus: 'cancelled',
        paymentStatus: ord.paymentStatus === 'paid' ? 'refunded' : ord.paymentStatus
      }));

      // Update payment if success
      PaxoDB.update('payments', p => p.orderId === orderId, () => ({ status: 'Refunded' }));

      PaxoUtils.toast('Order cancelled and stock levels restored.', 'info');
      PaxoAdmin.renderOrders();
      PaxoAdmin.renderStats();
      PaxoAdmin.renderActivityFeed();
      if (window.PaxoStore) {
        window.PaxoStore.renderStore();
        window.PaxoStore.renderCart();
      }
    }
  },

  refundOrder: (orderId) => {
    if (confirm('Are you sure you want to refund this order transaction? Grand total will be credited back, and inventory stock restored.')) {
      const ord = PaxoDB.get('orders').find(o => o.id === orderId);
      if (!ord) return;

      // Restore stocks
      const products = PaxoDB.get('products');
      ord.items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          prod.stock += item.qty;
          if (prod.status === 'out_of_stock' && prod.stock > 0) {
            prod.status = 'active';
          }
        }
      });
      PaxoDB.save('products', products);

      // Update Order
      PaxoDB.update('orders', o => o.id === orderId, () => ({ 
        paymentStatus: 'refunded',
        orderStatus: 'cancelled'
      }));

      // Update payment status
      PaxoDB.update('payments', p => p.orderId === orderId, () => ({ status: 'Refunded' }));
      
      PaxoAdmin.logNotification('refund_issued', 'Refund Processed', `Order ID ${orderId} has been fully refunded.`);

      PaxoUtils.toast('Refund processed and stocks restored.', 'success');
      PaxoAdmin.renderOrders();
      PaxoAdmin.renderStats();
      PaxoAdmin.renderActivityFeed();
      PaxoAdmin.renderPayments();
      if (window.PaxoStore) {
        window.PaxoStore.renderStore();
        window.PaxoStore.renderCart();
      }
    }
  },

  // ==========================================
  // 💳 Payment Center Operations (extended)
  // ==========================================
  renderPayments: () => {
    const payments = PaxoDB.get('payments').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const tbody = document.getElementById('admin-payments-table-body');
    
    // Render Payment center stats
    const totalReceived = payments.filter(p => p.status === 'Success').reduce((sum, p) => sum + p.amount, 0);
    const totalPending = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const totalFailed = payments.filter(p => p.status === 'Failed').reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = payments.filter(p => p.status === 'Refunded').reduce((sum, p) => sum + p.amount, 0);

    const recEl = document.getElementById('payment-stat-received');
    if (recEl) recEl.textContent = `₹${totalReceived.toLocaleString('en-IN')}`;

    const penEl = document.getElementById('payment-stat-pending');
    if (penEl) penEl.textContent = `₹${totalPending.toLocaleString('en-IN')}`;

    const failEl = document.getElementById('payment-stat-failed');
    if (failEl) failEl.textContent = `₹${totalFailed.toLocaleString('en-IN')}`;

    const refEl = document.getElementById('payment-stat-refunded');
    if (refEl) refEl.textContent = `₹${totalRefunded.toLocaleString('en-IN')}`;

    // Render reports breakdown
    const reportBreakdown = document.getElementById('payment-report-breakdown');
    if (reportBreakdown) {
      const methods = { Card: 0, UPI: 0, Razorpay: 0, Cash: 0 };
      payments.filter(p => p.status === 'Success').forEach(p => {
        methods[p.method] = (methods[p.method] || 0) + p.amount;
      });

      const methodTotal = Object.values(methods).reduce((a, b) => a + b, 0) || 1;
      reportBreakdown.innerHTML = Object.entries(methods).map(([meth, amt]) => {
        const pct = Math.round((amt / methodTotal) * 100);
        return `
          <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
            <span>${meth} Checkout</span>
            <span style="font-weight: bold;">₹${amt.toLocaleString('en-IN')} (${pct}%)</span>
          </div>
        `;
      }).join('');
    }

    if (!tbody) return;

    if (payments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted); font-style: italic;">
            No transactions logs recorded.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = payments.map(pay => {
      const dateStr = PaxoUtils.formatFullDate(pay.timestamp);
      let statusBadge = 'badge-success';
      if (pay.status === 'Failed') statusBadge = 'badge-danger';
      if (pay.status === 'Pending') statusBadge = 'badge-info';
      if (pay.status === 'Refunded') statusBadge = 'badge-warning';

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-family: monospace; font-size: 13px; color: var(--secondary);">${pay.paymentId}</td>
          <td style="padding: 12px; font-family: monospace; font-size: 12px; color: var(--text-muted);">${pay.orderId.substring(0, 12)}...</td>
          <td style="padding: 12px;">${dateStr}</td>
          <td style="padding: 12px; font-weight: bold; color: var(--success);">₹${pay.amount.toLocaleString('en-IN')}</td>
          <td style="padding: 12px; font-weight: 500;">${pay.method}</td>
          <td style="padding: 12px;"><span class="badge ${statusBadge}">${pay.status.toUpperCase()}</span></td>
          <td style="padding: 12px; display: flex; gap: 6px;">
            ${pay.status === 'Pending' ? `<button class="btn btn-sm btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="PaxoAdmin.markTransactionPaid('${pay.paymentId}')">Mark Paid</button>` : ''}
            ${pay.status === 'Success' ? `<button class="btn btn-sm btn-danger-outline" style="padding: 4px 8px; font-size: 11px;" onclick="PaxoAdmin.refundOrder('${pay.orderId}')">Refund</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  markTransactionPaid: (payId) => {
    const pay = PaxoDB.get('payments').find(p => p.paymentId === payId);
    if (!pay) return;

    PaxoDB.update('payments', p => p.paymentId === payId, () => ({ status: 'Success' }));
    PaxoDB.update('orders', o => o.id === pay.orderId, () => ({ paymentStatus: 'paid' }));
    
    PaxoUtils.toast('Transaction marked as paid.', 'success');
    PaxoAdmin.renderPayments();
    PaxoAdmin.renderOrders();
    PaxoAdmin.renderStats();
  },

  exportCSV: () => {
    const payments = PaxoDB.get('payments');
    const orders = PaxoDB.get('orders');
    const users = PaxoDB.get('users');

    const csvHeaders = ['Payment ID', 'Order ID', 'Date', 'Customer Name', 'Customer Email', 'Amount', 'Method', 'Status'];
    const csvRows = [csvHeaders.join(',')];

    payments.forEach(pay => {
      const order = orders.find(o => o.id === pay.orderId) || {};
      const user = users.find(u => u.id === order.user_id) || { name: 'N/A', email: 'N/A' };
      const row = [
        `"${pay.paymentId}"`,
        `"${pay.orderId}"`,
        `"${new Date(pay.timestamp).toLocaleString()}"`,
        `"${user.name}"`,
        `"${user.email}"`,
        pay.amount,
        `"${pay.method}"`,
        `"${pay.status}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PaxoVet_Payments_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    PaxoUtils.toast('CSV transaction report downloaded successfully.', 'success');
  },

  openInvoiceModal: (orderId) => {
    const ord = PaxoDB.get('orders').find(o => o.id === orderId);
    if (!ord) return;

    const users = PaxoDB.get('users');
    const customer = users.find(u => u.id === ord.user_id) || { name: 'Aryan Sharma', email: 'aryan@customer.com' };

    const dateLbl = document.getElementById('invoice-date-lbl');
    const refLbl = document.getElementById('invoice-ref-lbl');
    const custLbl = document.getElementById('invoice-cust-lbl');
    const totalLbl = document.getElementById('invoice-total-lbl');
    const itemsList = document.getElementById('invoice-items-list');

    if (dateLbl) dateLbl.textContent = `Date: ${PaxoUtils.formatFullDate(ord.date)}`;
    if (refLbl) refLbl.textContent = ord.id;
    if (custLbl) custLbl.textContent = `${customer.name} (${customer.email})`;
    if (totalLbl) totalLbl.textContent = `₹${ord.total.toLocaleString('en-IN')}`;

    if (itemsList) {
      itemsList.innerHTML = ord.items.map(item => `
        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0;">
          <span>📦 ${item.name} <span style="color: var(--text-muted);">x ${item.qty}</span></span>
          <span style="font-weight: 600;">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
        </div>
      `).join('');
    }

    const modal = document.getElementById('invoice-modal');
    if (modal) modal.style.display = 'flex';
  },

  // ==========================================
  // 🔔 Dynamic Notifications System
  // ==========================================
  logNotification: (type, title, message) => {
    const newNotif = {
      id: PaxoUtils.uuid('notif'),
      type: type,
      title: title,
      message: message,
      date: new Date().toISOString(),
      isRead: false
    };
    PaxoDB.insert('notifications', newNotif);
    PaxoAdmin.renderNotifications();
  },

  renderNotifications: () => {
    const notifs = PaxoDB.get('notifications').sort((a, b) => new Date(b.date) - new Date(a.date));
    const listContainer = document.getElementById('admin-notif-drawer-list');
    const badge = document.getElementById('notif-badge-count');

    const unreadCount = notifs.filter(n => !n.isRead).length;
    
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (!listContainer) return;

    if (notifs.length === 0) {
      listContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 24px; font-style: italic;">No new notification alerts.</p>`;
      return;
    }

    listContainer.innerHTML = notifs.map(notif => {
      let icon = '🔔';
      if (notif.type === 'new_booking') icon = '📅';
      if (notif.type === 'low_stock') icon = '⚠️';
      if (notif.type === 'payment_success') icon = '💳';
      if (notif.type === 'payment_failure') icon = '❌';
      if (notif.type === 'refund_issued') icon = '🔄';

      return `
        <div class="notif-item ${notif.isRead ? '' : 'unread'}" style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); background: ${notif.isRead ? 'transparent' : 'rgba(37,99,235,0.06)'}; transition: var(--transition-fast);">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <span style="font-size: 16px; margin-top: 2px;">${icon}</span>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h5 style="margin: 0; font-size: 13px; font-weight: 700; color: ${notif.isRead ? 'var(--text-main)' : 'var(--secondary)'};">${notif.title}</h5>
                ${!notif.isRead ? `<span style="cursor: pointer; font-size: 10px; font-weight: bold; color: var(--primary);" onclick="PaxoAdmin.markNotificationRead('${notif.id}')">Read</span>` : ''}
              </div>
              <p style="margin: 4px 0 0; font-size: 12px; color: var(--text-muted); line-height: 1.4;">${notif.message}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  markNotificationRead: (notifId) => {
    PaxoDB.update('notifications', n => n.id === notifId, () => ({ isRead: true }));
    PaxoAdmin.renderNotifications();
  },

  clearAllNotifications: () => {
    PaxoDB.save('notifications', []);
    PaxoAdmin.renderNotifications();
    PaxoUtils.toast('Cleared all notification alerts.', 'info');
  },

  toggleNotificationDrawer: (show) => {
    const drawer = document.getElementById('notif-drawer');
    if (drawer) {
      if (show === undefined) {
        drawer.classList.toggle('open');
      } else if (show) {
        drawer.classList.add('open');
        PaxoAdmin.renderNotifications();
      } else {
        drawer.classList.remove('open');
      }
    }
  }
};
