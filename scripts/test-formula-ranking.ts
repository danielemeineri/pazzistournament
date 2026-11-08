import {
  calcolaDelta,
  getMoltiplicatoreFase,
  getMoltiplicatoreEsito,
} from "@/lib/ranking/formula";

import {
  EsitoRanking,
  ModalitaVittoria,
} from "@/lib/ranking/tipi";

function test(
  nome: string,
  ratingSquadra: number,
  ratingAvversario: number,
  esito: EsitoRanking,
  fase: string,
  modalita: ModalitaVittoria
) {
  const delta = calcolaDelta(
    ratingSquadra,
    ratingAvversario,
    esito,
    fase,
    modalita
  );

  console.log(
    `${nome.padEnd(55)} ` +
      `rating ${ratingSquadra} vs ${ratingAvversario} | ` +
      `${esito.padEnd(10)} | ` +
      `${modalita.padEnd(15)} | ` +
      `${fase.padEnd(25)} | ` +
      `Δ ${delta >= 0 ? "+" : ""}${delta}`
  );
}

console.log("");
console.log("==============================================================");
console.log(" TEST FORMULA RANKING PAZZITOURNAMENT");
console.log("==============================================================");
console.log("");

// =========================================================
// MOLTIPLICATORI FASE
// =========================================================

console.log("----------------------------------------");
console.log("MOLTIPLICATORI DELLE FASI");
console.log("----------------------------------------");

const fasi = [
  "Girone",
  "Playoff",
  "Ottavi",
  "Quarti",
  "Finale 3°/4° posto",
  "Semifinale",
  "Finale",
];

for (const fase of fasi) {
  console.log(
    `${fase.padEnd(30)} -> ${getMoltiplicatoreFase(fase)}`
  );
}

console.log("");

// =========================================================
// MOLTIPLICATORI ESITO
// =========================================================

console.log("----------------------------------------");
console.log("MOLTIPLICATORI DEGLI ESITI");
console.log("----------------------------------------");

const combinazioni: {
  esito: EsitoRanking;
  modalita: ModalitaVittoria;
}[] = [
  {
    esito: "VITTORIA",
    modalita: "REGOLAMENTARE",
  },
  {
    esito: "SCONFITTA",
    modalita: "REGOLAMENTARE",
  },
  {
    esito: "PAREGGIO",
    modalita: "REGOLAMENTARE",
  },
  {
    esito: "VITTORIA",
    modalita: "SUPPLEMENTARI",
  },
  {
    esito: "SCONFITTA",
    modalita: "SUPPLEMENTARI",
  },
  {
    esito: "VITTORIA",
    modalita: "RIGORI",
  },
  {
    esito: "SCONFITTA",
    modalita: "RIGORI",
  },
];

for (const combinazione of combinazioni) {
  console.log(
    `${combinazione.esito.padEnd(10)} ` +
      `${combinazione.modalita.padEnd(15)} -> ` +
      getMoltiplicatoreEsito(
        combinazione.esito,
        combinazione.modalita
      )
  );
}

console.log("");

// =========================================================
// TEST RATING
// =========================================================

console.log("----------------------------------------");
console.log("TEST VARIAZIONI RATING");
console.log("----------------------------------------");
console.log("");

test(
  "1. Pari rating: vittoria nei 90'",
  0,
  0,
  "VITTORIA",
  "Girone",
  "REGOLAMENTARE"
);

test(
  "2. Pari rating: sconfitta nei 90'",
  0,
  0,
  "SCONFITTA",
  "Girone",
  "REGOLAMENTARE"
);

test(
  "3. Forte batte debole nei 90'",
  600,
  200,
  "VITTORIA",
  "Girone",
  "REGOLAMENTARE"
);

test(
  "4. Debole batte forte nei 90'",
  200,
  600,
  "VITTORIA",
  "Girone",
  "REGOLAMENTARE"
);

test(
  "5. Forte perde contro debole nei 90'",
  600,
  200,
  "SCONFITTA",
  "Girone",
  "REGOLAMENTARE"
);

test(
  "6. Debole perde contro forte nei 90'",
  200,
  600,
  "SCONFITTA",
  "Girone",
  "REGOLAMENTARE"
);

test(
  "7. Vittoria ai supplementari",
  400,
  400,
  "VITTORIA",
  "Girone",
  "SUPPLEMENTARI"
);

test(
  "8. Sconfitta ai supplementari",
  400,
  400,
  "SCONFITTA",
  "Girone",
  "SUPPLEMENTARI"
);

test(
  "9. Vittoria ai rigori",
  400,
  400,
  "VITTORIA",
  "Girone",
  "RIGORI"
);

test(
  "10. Sconfitta ai rigori",
  400,
  400,
  "SCONFITTA",
  "Girone",
  "RIGORI"
);

console.log("");

// =========================================================
// TEST PESO FASI
// =========================================================

console.log("----------------------------------------");
console.log("TEST PESO DELLE FASI");
console.log("----------------------------------------");
console.log("");

test(
  "11. Vittoria nel girone",
  400,
  400,
  "VITTORIA",
  "Girone",
  "REGOLAMENTARE"
);

test(
  "12. Vittoria agli ottavi",
  400,
  400,
  "VITTORIA",
  "Ottavi",
  "REGOLAMENTARE"
);

test(
  "13. Vittoria ai quarti",
  400,
  400,
  "VITTORIA",
  "Quarti",
  "REGOLAMENTARE"
);

test(
  "14. Vittoria in semifinale",
  400,
  400,
  "VITTORIA",
  "Semifinale",
  "REGOLAMENTARE"
);

test(
  "15. Vittoria finale 3°/4° posto",
  400,
  400,
  "VITTORIA",
  "Finale 3°/4° posto",
  "REGOLAMENTARE"
);

test(
  "16. Vittoria in finale",
  400,
  400,
  "VITTORIA",
  "Finale",
  "REGOLAMENTARE"
);

console.log("");

console.log("==============================================================");
console.log(" TEST COMPLETATO");
console.log("==============================================================");
console.log("");
console.log("Questo script non modifica il database.");
console.log("");