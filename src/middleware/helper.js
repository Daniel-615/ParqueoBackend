async function hasUpcomingOrActiveReservation(parqueoId, minutesAhead = 10) {
  const now = new Date();
  const soon = new Date(now.getTime() + minutesAhead * 60 * 1000);
  const count = await Reserva.count({
    where: {
      parqueo_id: parqueoId,
      status: ACTIVE_STATES,
      [Op.or]: [
        // en curso
        { from: { [Op.lte]: now }, to: { [Op.gt]: now } },
        // empieza en breve
        { from: { [Op.lte]: soon }, to: { [Op.gt]: now } },
      ],
    },
  });
  return count > 0;
}
