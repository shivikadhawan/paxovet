// PaxoVet Customer Dashboard Manager
window.PaxoCustomer = {
  activePetId: null, // Track pet during editing
  selectedDate: '',   // Selected booking date
  selectedSlotId: '', // Selected slot id

  init: () => {
    PaxoCustomer.renderPets();
    PaxoCustomer.renderBookings();
    PaxoCustomer.renderHistory();
    PaxoCustomer.setupBookingCalendar();
  },

  // ==========================================
  // 🐶 PETS MANAGEMENT TABS
  // ==========================================
  renderPets: () => {
    const user = PaxoAuth.currentUser();
    if (!user) return;

    const pets = PaxoDB.get('pets').filter(p => p.owner_id === user.id);
    const petsGrid = document.getElementById('pets-grid');
    if (!petsGrid) return;

    if (pets.length === 0) {
      petsGrid.innerHTML = `
        <div class="empty-state">
          <span style="font-size: 56px;">🦴</span>
          <h3>No Furry Family Members Registered</h3>
          <p>Please register your pets to manage their care and book appointments.</p>
          <button class="btn btn-primary" onclick="PaxoCustomer.openPetModal()">+ Add Pet Profile</button>
        </div>
      `;
      return;
    }

    petsGrid.innerHTML = pets.map(pet => `
      <div class="glass-card pet-card">
        <div class="pet-header">
          <img src="${pet.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'}" alt="${pet.name}" class="pet-avatar" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'">
          <div class="pet-title-box">
            <h4>${pet.name}</h4>
            <span class="badge badge-info">${pet.species} • ${pet.breed || 'Mixed'}</span>
          </div>
        </div>
        <div class="pet-details">
          <p><strong>Age:</strong> ${pet.age || 'N/A'} yrs</p>
          <p><strong>Gender:</strong> ${pet.gender || 'Male'}</p>
          <p><strong>Weight:</strong> ${pet.weight || 'N/A'} kg</p>
          <p><strong>Vaccination:</strong> ${pet.vaccination_status || 'Pending'}</p>
        </div>
        ${pet.notes ? `<p class="pet-notes"><em>"${pet.notes}"</em></p>` : ''}
        <div class="pet-actions">
          <button class="btn btn-sm btn-outline" onclick="PaxoCustomer.openPetModal('${pet.id}')">Edit</button>
          <button class="btn btn-sm btn-danger-outline" onclick="PaxoCustomer.deletePet('${pet.id}')">Delete</button>
        </div>
      </div>
    `).join('') + `
      <div class="add-pet-placeholder" onclick="PaxoCustomer.openPetModal()">
        <span>➕</span>
        <p>Add Another Pet</p>
      </div>
    `;
  },

  openPetModal: (petId = null) => {
    const modal = document.getElementById('pet-modal');
    if (!modal) return;

    PaxoCustomer.activePetId = petId;
    const titleEl = document.getElementById('pet-modal-title');
    
    // Form fields
    const nameInput = document.getElementById('pet-name');
    const speciesInput = document.getElementById('pet-species');
    const breedInput = document.getElementById('pet-breed');
    const ageInput = document.getElementById('pet-age');
    const genderInput = document.getElementById('pet-gender');
    const weightInput = document.getElementById('pet-weight');
    const vacInput = document.getElementById('pet-vaccination');
    const notesInput = document.getElementById('pet-notes');
    const photoSelect = document.getElementById('pet-photo-select');

    if (petId) {
      // Edit mode
      titleEl.textContent = 'Edit Pet Profile';
      const pet = PaxoDB.get('pets').find(p => p.id === petId);
      if (pet) {
        nameInput.value = pet.name || '';
        speciesInput.value = pet.species || 'Dog';
        breedInput.value = pet.breed || '';
        ageInput.value = pet.age || '';
        genderInput.value = pet.gender || 'Male';
        weightInput.value = pet.weight || '';
        vacInput.value = pet.vaccination_status || '';
        notesInput.value = pet.notes || '';
        if (photoSelect) photoSelect.value = pet.image_url || '';
      }
    } else {
      // Add mode
      titleEl.textContent = 'Register New Pet';
      nameInput.value = '';
      speciesInput.value = 'Dog';
      breedInput.value = '';
      ageInput.value = '';
      genderInput.value = 'Male';
      weightInput.value = '';
      vacInput.value = 'Fully Vaccinated';
      notesInput.value = '';
      if (photoSelect) photoSelect.value = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400';
    }

    modal.style.display = 'flex';
  },

  hidePetModal: () => {
    const modal = document.getElementById('pet-modal');
    if (modal) modal.style.display = 'none';
  },

  savePet: (event) => {
    event.preventDefault();
    const user = PaxoAuth.currentUser();
    if (!user) return;

    const name = document.getElementById('pet-name').value.trim();
    if (!name) {
      PaxoUtils.toast('Pet Name is required.', 'error');
      return;
    }

    const payload = {
      owner_id: user.id,
      name: name,
      species: document.getElementById('pet-species').value,
      breed: document.getElementById('pet-breed').value.trim(),
      age: parseFloat(document.getElementById('pet-age').value) || null,
      gender: document.getElementById('pet-gender').value,
      weight: parseFloat(document.getElementById('pet-weight').value) || null,
      vaccination_status: document.getElementById('pet-vaccination').value.trim(),
      notes: document.getElementById('pet-notes').value.trim(),
      image_url: document.getElementById('pet-photo-select').value
    };

    if (PaxoCustomer.activePetId) {
      // Update
      PaxoDB.update('pets', p => p.id === PaxoCustomer.activePetId, () => payload);
      PaxoUtils.toast('Pet profile updated successfully!', 'success');
    } else {
      // Create
      const newPet = {
        id: PaxoUtils.uuid('pet'),
        ...payload
      };
      PaxoDB.insert('pets', newPet);
      PaxoUtils.toast('Pet profile created successfully!', 'success');
    }

    PaxoCustomer.hidePetModal();
    PaxoCustomer.renderPets();
  },

  deletePet: (petId) => {
    if (confirm('Are you sure you want to delete this pet profile? All records associated with it will remain, but the profile will be removed.')) {
      PaxoDB.delete('pets', p => p.id === petId);
      PaxoUtils.toast('Pet profile removed.', 'success');
      PaxoCustomer.renderPets();
    }
  },

  // ==========================================
  // 📅 APPOINTMENTS BOOKING TABS
  // ==========================================
  setupBookingCalendar: () => {
    const container = document.getElementById('calendar-dates-row');
    if (!container) return;

    const dates = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        dayString: weekdays[d.getDay()],
        dateNum: d.getDate(),
        fullIso: d.toISOString().split('T')[0]
      });
    }

    // Default selection
    PaxoCustomer.selectedDate = dates[0].fullIso;

    container.innerHTML = dates.map((d, index) => `
      <div class="calendar-date-card ${index === 0 ? 'active' : ''}" data-date="${d.fullIso}" onclick="PaxoCustomer.selectBookingDate('${d.fullIso}', this)">
        <span class="day-lbl">${d.dayString}</span>
        <span class="date-num">${d.dateNum}</span>
      </div>
    `).join('');

    PaxoCustomer.renderAvailableSlots();
  },

  selectBookingDate: (dateIso, element) => {
    PaxoCustomer.selectedDate = dateIso;
    document.querySelectorAll('.calendar-date-card').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    PaxoCustomer.renderAvailableSlots();
  },

  renderAvailableSlots: () => {
    const slots = PaxoDB.get('slots').filter(s => s.date === PaxoCustomer.selectedDate && s.status === 'open' && s.bookedCount < s.maxBookings);
    const slotsGrid = document.getElementById('booking-slots-grid');
    if (!slotsGrid) return;

    if (slots.length === 0) {
      slotsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-style: italic; padding: 24px;">
          No slots available for this date. (Go to Admin Portal to open slots!)
        </div>
      `;
      return;
    }

    slotsGrid.innerHTML = slots.map(slot => `
      <div class="slot-card ${PaxoCustomer.selectedSlotId === slot.id ? 'active' : ''}" data-slot-id="${slot.id}" onclick="PaxoCustomer.selectSlot('${slot.id}', this)">
        <span>⏰ ${slot.startTime} - ${slot.endTime} (${slot.bookedCount}/${slot.maxBookings})</span>
      </div>
    `).join('');
  },

  selectSlot: (slotId, element) => {
    PaxoCustomer.selectedSlotId = slotId;
    document.querySelectorAll('.slot-card').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
  },

  openBookingModal: () => {
    const user = PaxoAuth.currentUser();
    if (!user) return;

    const pets = PaxoDB.get('pets').filter(p => p.owner_id === user.id);
    if (pets.length === 0) {
      PaxoUtils.toast('You must register at least one pet to book a slot.', 'error');
      window.location.hash = '#/customer/pets';
      return;
    }

    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    // Set selected pet default
    const petSelect = document.getElementById('booking-pet-select');
    if (petSelect) {
      petSelect.innerHTML = pets.map(p => `<option value="${p.id}">${p.name} (${p.species})</option>`).join('');
    }

    // Set datetime preview
    const datePreview = document.getElementById('booking-time-preview');
    const selectedSlotObj = PaxoDB.get('slots').find(s => s.id === PaxoCustomer.selectedSlotId);

    if (!selectedSlotObj) {
      PaxoUtils.toast('Please select an available time slot card first.', 'error');
      return;
    }

    if (datePreview) {
      datePreview.innerHTML = `📅 <strong>Date:</strong> ${PaxoUtils.formatFullDate(PaxoCustomer.selectedDate)} <br> ⏰ <strong>Time:</strong> ${selectedSlotObj.startTime} - ${selectedSlotObj.endTime}`;
    }

    modal.style.display = 'flex';
  },

  hideBookingModal: () => {
    const modal = document.getElementById('booking-modal');
    if (modal) modal.style.display = 'none';
  },

  submitBooking: (event) => {
    event.preventDefault();
    const user = PaxoAuth.currentUser();
    if (!user) return;

    const petId = document.getElementById('booking-pet-select').value;
    const reason = document.getElementById('booking-reason').value.trim();

    if (!reason) {
      PaxoUtils.toast('Please enter a reason for consultation.', 'error');
      return;
    }

    const slotObj = PaxoDB.get('slots').find(s => s.id === PaxoCustomer.selectedSlotId);
    if (!slotObj) return;

    // Calculate timestamp ISO string
    let hourPart = "11:00:00";
    if (slotObj.startTime.includes('09:30')) hourPart = "09:30:00";
    if (slotObj.startTime.includes('11:00')) hourPart = "11:00:00";
    if (slotObj.startTime.includes('12:30')) hourPart = "12:30:00";
    if (slotObj.startTime.includes('03:00')) hourPart = "15:00:00";
    if (slotObj.startTime.includes('04:30')) hourPart = "16:30:00";
    if (slotObj.startTime.includes('06:00')) hourPart = "18:00:00";
    const datetimeStr = `${PaxoCustomer.selectedDate}T${hourPart}Z`;

    const newAppt = {
      id: PaxoUtils.uuid('appt'),
      pet_id: petId,
      datetime: datetimeStr,
      status: 'submitted', 
      reason: reason
    };

    // Increment booking count and update status
    const updatedCount = slotObj.bookedCount + 1;
    PaxoDB.update('slots', s => s.id === PaxoCustomer.selectedSlotId, () => ({ 
      bookedCount: updatedCount,
      status: updatedCount >= slotObj.maxBookings ? 'full' : 'open'
    }));

    // Insert Appt
    PaxoDB.insert('appointments', newAppt);

    // Alert Admin Notification
    if (window.PaxoAdmin) {
      const pet = PaxoDB.get('pets').find(p => p.id === petId) || { name: 'Pet' };
      window.PaxoAdmin.logNotification('new_booking', 'New Appointment Booking', `${user.name} scheduled appointment for ${pet.name} on ${PaxoUtils.formatFullDate(PaxoCustomer.selectedDate)} at ${slotObj.startTime}.`);
    }

    PaxoUtils.toast('Appointment scheduled! Waiting for admin approval.', 'success');
    PaxoCustomer.hideBookingModal();
    
    // Clear selection
    PaxoCustomer.selectedSlotId = '';
    
    // Re-render
    PaxoCustomer.renderBookings();
    PaxoCustomer.renderAvailableSlots();
  },

  renderBookings: () => {
    const user = PaxoAuth.currentUser();
    if (!user) return;

    const myPets = PaxoDB.get('pets').filter(p => p.owner_id === user.id);
    const myPetIds = myPets.map(p => p.id);

    const appts = PaxoDB.get('appointments')
      .filter(a => myPetIds.includes(a.pet_id))
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    const bookingsList = document.getElementById('bookings-list');
    if (!bookingsList) return;

    if (appts.length === 0) {
      bookingsList.innerHTML = `
        <div class="empty-state">
          <span style="font-size: 56px;">📅</span>
          <h3>No Booked Appointments</h3>
          <p>Schedule a vet consultation checkup in the sidebar calendar.</p>
        </div>
      `;
      return;
    }

    bookingsList.innerHTML = appts.map(appt => {
      const pet = myPets.find(p => p.id === appt.pet_id) || { name: 'Furry Friend' };
      const dateObj = new Date(appt.datetime);
      
      let badgeClass = 'badge-info';
      if (appt.status === 'approved') badgeClass = 'badge-success';
      if (appt.status === 'completed') badgeClass = 'badge-outline';
      if (appt.status === 'cancelled') badgeClass = 'badge-danger';
      if (appt.status === 'in_progress') badgeClass = 'badge-warning';

      return `
        <div class="glass-card appt-item">
          <div class="appt-meta">
            <h4>${pet.name} 🐶</h4>
            <span class="badge ${badgeClass}">${appt.status.toUpperCase()}</span>
          </div>
          <p class="appt-time">📅 ${PaxoUtils.formatDate(dateObj)} at ${PaxoUtils.formatTime(dateObj)}</p>
          <p class="appt-reason"><strong>Reason:</strong> ${appt.reason}</p>
          ${appt.status === 'submitted' || appt.status === 'approved' ? `
            <button class="btn btn-sm btn-danger-outline" style="margin-top: 12px;" onclick="PaxoCustomer.cancelBooking('${appt.id}')">Cancel Booking</button>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  cancelBooking: (apptId) => {
    if (confirm('Are you sure you want to cancel this appointment slot booking?')) {
      const appt = PaxoDB.get('appointments').find(a => a.id === apptId);
      if (appt) {
        // Release Slot Count
        const slotDate = appt.datetime.split('T')[0];
        const slotTime = PaxoUtils.formatTime(new Date(appt.datetime));
        const slot = PaxoDB.get('slots').find(s => s.date === slotDate && s.startTime.includes(slotTime.substring(0, 5)));
        if (slot) {
          const newCount = Math.max(slot.bookedCount - 1, 0);
          PaxoDB.update('slots', s => s.id === slot.id, () => ({
            bookedCount: newCount,
            status: newCount >= slot.maxBookings ? 'full' : 'open'
          }));
        }
      }

      PaxoDB.update('appointments', a => a.id === apptId, () => ({ status: 'cancelled' }));
      PaxoUtils.toast('Appointment cancelled.', 'info');
      PaxoCustomer.renderBookings();
      PaxoCustomer.renderAvailableSlots();
      if (window.PaxoAdmin) {
        window.PaxoAdmin.logNotification('appt_cancelled', 'Booking Cancelled', `A customer cancelled their booking reservation.`);
      }
    }
  },

  // ==========================================
  // 📄 MEDICAL & TREATMENT HISTORY
  // ==========================================
  renderHistory: () => {
    const user = PaxoAuth.currentUser();
    if (!user) return;

    const myPets = PaxoDB.get('pets').filter(p => p.owner_id === user.id);
    const myPetIds = myPets.map(p => p.id);

    const treatments = PaxoDB.get('treatments')
      .filter(t => myPetIds.includes(t.pet_id))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const historyTimeline = document.getElementById('history-timeline');
    if (!historyTimeline) return;

    if (treatments.length === 0) {
      historyTimeline.innerHTML = `
        <div class="empty-state">
          <span style="font-size: 56px;">🏥</span>
          <h3>No Diagnosis Records Found</h3>
          <p>Prescriptions will appear here once Vets publish treatment details.</p>
        </div>
      `;
      return;
    }

    historyTimeline.innerHTML = treatments.map(treat => {
      const pet = myPets.find(p => p.id === treat.pet_id) || { name: 'Bruno' };
      const medicines = treat.medicines || [];

      return `
        <div class="glass-card treatment-card">
          <div class="treatment-header">
            <div>
              <h4 style="color: var(--secondary);">${pet.name} 🐾</h4>
              <span class="treatment-doc">Prescribed by ${treat.doctor_name || 'Dr. Vikram Patel'}</span>
            </div>
            <span class="treatment-date">📅 ${PaxoUtils.formatFullDate(treat.date)}</span>
          </div>

          <div class="treatment-section">
            <span class="sec-lbl">Diagnosis</span>
            <p class="sec-val">${treat.diagnosis}</p>
          </div>

          ${medicines.length > 0 ? `
            <div class="treatment-section">
              <span class="sec-lbl">Prescription Plan</span>
              <div class="meds-list">
                ${medicines.map(m => `
                  <div class="med-item">
                    <span>💊 <strong>${m.name}</strong></span>
                    <span>${m.dosage} • ${m.days} days</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${treat.notes ? `
            <div class="treatment-section">
              <span class="sec-lbl">Doctor Notes</span>
              <p class="notes-text">"${treat.notes}"</p>
            </div>
          ` : ''}

          <div class="treatment-actions">
            <button class="btn btn-sm btn-outline" onclick="PaxoCustomer.shareRecord('${treat.id}')">Share Record 📤</button>
          </div>
        </div>
      `;
    }).join('');
  },

  shareRecord: (treatmentId) => {
    const treat = PaxoDB.get('treatments').find(t => t.id === treatmentId);
    if (!treat) return;

    const pets = PaxoDB.get('pets');
    const pet = pets.find(p => p.id === treat.pet_id) || { name: 'Bruno', species: 'Dog' };
    const dateFormatted = PaxoUtils.formatFullDate(treat.date);
    const meds = (treat.medicines || [])
      .map(m => `- ${m.name}: ${m.dosage} (${m.days} days)`)
      .join('\n');

    const message = `🐾 PaxoVet Treatment Record\n` +
      `Pet: ${pet.name} (${pet.species})\n` +
      `Date: ${dateFormatted}\n` +
      `Diagnosis: ${treat.diagnosis}\n` +
      `Prescription:\n${meds}\n` +
      `Vet Notes: ${treat.notes || 'None'}\n` +
      `Doctor: ${treat.doctor_name || 'Dr. Vikram Patel'}`;

    if (navigator.share) {
      navigator.share({
        title: `PaxoVet Treatment: ${pet.name}`,
        text: message
      }).catch(err => {
        console.log("Share cancelled:", err);
      });
    } else {
      // Fallback copy to clipboard
      navigator.clipboard.writeText(message).then(() => {
        PaxoUtils.toast('Treatment record copied to clipboard! You can paste and share it.', 'success');
      }).catch(err => {
        PaxoUtils.toast('Could not copy treatment record.', 'error');
      });
    }
  }
};
