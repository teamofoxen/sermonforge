// "This Day in Church History" — small curated dataset keyed by MM-DD.
// On load, looks up today's date; if nothing matches exactly, walks
// backward up to 30 days to find the nearest preceding event so the
// panel always renders something meaningful.
//
// Sourcing: dates and bare facts are well-established. Wording is
// neutral / paraphrased — not lifted from any single source.

export const HISTORY_BY_DATE = {
  // ── January ──
  "01-06": { year: 0, event: "Epiphany — the traditional commemoration of the visit of the Magi to the infant Christ, observed by the Church since at least the 4th century." },
  "01-08": { year: 1956, event: "Five missionaries — Jim Elliot, Nate Saint, Ed McCully, Pete Fleming, and Roger Youderian — were martyred in Ecuador while attempting to reach the Huaorani people." },
  "01-15": { year: 1929, event: "Martin Luther King Jr. was born in Atlanta. He would draw deeply on the prophetic tradition of Scripture in shaping the American civil rights movement." },
  "01-17": { year: 356, event: "Anthony of Egypt — the father of Christian monasticism — died in the Egyptian desert at the age of 105." },
  "01-21": { year: 1525, event: "The first adult re-baptism of the Radical Reformation took place in Zurich, marking the birth of the Anabaptist movement." },
  "01-25": { year: 1736, event: "John Wesley, en route to Georgia, was caught in a violent Atlantic storm; the calm faith of the Moravians on board planted the seed of his later conversion." },
  "01-28": { year: 1547, event: "King Henry VIII of England died, ending the reign that severed the Church of England from Rome." },
  "01-31": { year: 1892, event: "Charles Haddon Spurgeon — the 'Prince of Preachers' — died at Mentone, France, age 57." },

  // ── February ──
  "02-01": { year: 525, event: "Brigid of Kildare, one of Ireland's three patron saints, died at the abbey she had founded." },
  "02-02": { year: 1546, event: "Martin Luther preached his final sermon at Eisleben, his birthplace, three days before his death." },
  "02-14": { year: 869, event: "Cyril, who with his brother Methodius brought Christianity to the Slavs and devised the Glagolitic alphabet, died in Rome." },
  "02-18": { year: 1546, event: "Martin Luther died at Eisleben, age 62. His last written words: 'We are beggars. This is true.'" },
  "02-23": { year: 1685, event: "George Frideric Handel was born at Halle. He would later compose Messiah in just 24 days." },
  "02-27": { year: 380, event: "Emperor Theodosius issued the Edict of Thessalonica, making Nicene Christianity the official religion of the Roman Empire." },

  // ── March ──
  "03-02": { year: 1791, event: "John Wesley died at age 87, leaving behind a Methodist movement of 70,000 members and a legacy of field-preaching across Britain." },
  "03-07": { year: 203, event: "Perpetua and Felicitas were martyred in the arena at Carthage, leaving behind one of the earliest Christian martyrdom accounts written by a woman." },
  "03-17": { year: 461, event: "Patrick, the Romano-Briton kidnapped into Irish slavery who returned as a missionary, died at Saul. His Confessio remains a model of Christian autobiography." },
  "03-22": { year: 1758, event: "Jonathan Edwards died of complications from a smallpox inoculation, just five weeks after assuming the presidency of the College of New Jersey (Princeton)." },
  "03-25": { year: 0, event: "Annunciation — the Church's traditional commemoration of the angel Gabriel's announcement to Mary, observed nine months before Christmas since at least the 4th century." },
  "03-31": { year: 1631, event: "John Donne, dean of St. Paul's and one of the great metaphysical poets of English devotion, died in London." },

  // ── April ──
  "04-04": { year: 397, event: "Ambrose of Milan, the bishop who baptized Augustine and stood up to emperors, died on Holy Saturday." },
  "04-09": { year: 1945, event: "Dietrich Bonhoeffer was hanged at Flossenbürg concentration camp, days before its liberation. His last recorded words: 'This is the end — for me, the beginning of life.'" },
  "04-17": { year: 1899, event: "Dwight L. Moody died at Northfield, Massachusetts. The Chicago shoe salesman turned evangelist had preached to an estimated 100 million people." },
  "04-18": { year: 1521, event: "At the Diet of Worms, Martin Luther refused to recant: 'My conscience is captive to the Word of God. Here I stand. I can do no other.'" },
  "04-19": { year: 1560, event: "Philip Melanchthon, Luther's chief lieutenant and author of the Augsburg Confession, died at Wittenberg." },
  "04-21": { year: 1142, event: "Peter Abelard — the brilliant and tragic theologian whose Sic et Non shaped scholastic method — died at Cluny." },
  "04-25": { year: 0, event: "Feast of Mark the Evangelist — the traditional commemoration of the author of the Second Gospel and companion of Peter." },
  "04-29": { year: 1380, event: "Catherine of Siena — the Dominican mystic and Doctor of the Church who urged the pope to return from Avignon to Rome — died at age 33." },

  // ── May ──
  "05-02": { year: 373, event: "Athanasius of Alexandria — the great defender of Nicene orthodoxy against the Arian heresy — died after a lifetime of exiles for the faith." },
  "05-04": { year: 1521, event: "Martin Luther was 'kidnapped' on the Wartburg road by allies of Frederick the Wise and hidden at the Wartburg Castle, where he would translate the New Testament into German in 11 weeks." },
  "05-21": { year: 1738, event: "Charles Wesley experienced his evangelical conversion, three days before his brother John's famous 'heart strangely warmed' moment at Aldersgate." },
  "05-24": { year: 1738, event: "John Wesley's heart was 'strangely warmed' at a meeting on Aldersgate Street, London — the spark of the Methodist revival." },
  "05-27": { year: 1564, event: "John Calvin died at Geneva, age 54. He was buried in an unmarked grave at his own request." },
  "05-31": { year: 1809, event: "Joseph Haydn died in Vienna. His oratorios, especially The Creation, helped shape sacred classical music for the next century." },

  // ── June ──
  "06-05": { year: 754, event: "Boniface, the English missionary apostle to the Germans, was martyred by pagan Frisians while reading from a Gospel book he held over his head as a shield." },
  "06-11": { year: 0, event: "Feast of Barnabas the Apostle — Paul's companion on the first missionary journey, traditionally remembered on this day since the early Western church." },
  "06-19": { year: 1623, event: "Blaise Pascal was born at Clermont-Ferrand. His Pensées would become one of the most enduring Christian apologetics of the modern era." },
  "06-24": { year: 0, event: "Feast of John the Baptist — the traditional commemoration of his birth, set six months before Christmas in keeping with Luke 1." },
  "06-29": { year: 0, event: "Feast of Peter and Paul — the joint commemoration of the two great apostles, traditionally observed on the date of their martyrdom in Rome." },

  // ── July ──
  "07-04": { year: 1054, event: "The Great Schism formally began as papal legates excommunicated the Patriarch of Constantinople in the Hagia Sophia, splitting Eastern and Western Christendom." },
  "07-06": { year: 1415, event: "Jan Hus was burned at the stake at the Council of Constance, a century before Luther — singing as the flames rose." },
  "07-08": { year: 1741, event: "Jonathan Edwards preached 'Sinners in the Hands of an Angry God' at Enfield, Connecticut, igniting one of the most famous moments of the Great Awakening." },
  "07-10": { year: 1509, event: "John Calvin was born at Noyon in Picardy. His Institutes of the Christian Religion would shape Protestant theology for centuries." },
  "07-25": { year: 0, event: "Feast of James the Apostle — the brother of John, the first apostle martyred (Acts 12), traditionally remembered on this day." },
  "07-28": { year: 1750, event: "Johann Sebastian Bach died at Leipzig. He had inscribed S.D.G. — Soli Deo Gloria — at the end of his cantatas for over 40 years." },
  "07-29": { year: 1833, event: "William Wilberforce died three days after Parliament passed the Slavery Abolition Act — the cause he had given his life to as a Christian conviction." },

  // ── August ──
  "08-06": { year: 0, event: "Feast of the Transfiguration — the Church's commemoration of Christ's revealed glory on the mountain (Matt 17), observed since at least the 4th century in the East." },
  "08-08": { year: 1221, event: "Dominic, founder of the Order of Preachers, died at Bologna after preaching tours that took him from Spain to the Holy Land." },
  "08-10": { year: 258, event: "Lawrence of Rome was martyred under Emperor Valerian. Tradition records his quip on the gridiron: 'Turn me over — I'm done on this side.'" },
  "08-15": { year: 0, event: "Feast of the Assumption (West) / Dormition (East) — the Church's commemoration of the Virgin Mary's passing into heavenly glory." },
  "08-24": { year: 410, event: "Alaric and the Visigoths sacked Rome, prompting Augustine to begin writing City of God to defend Christianity from blame." },
  "08-28": { year: 430, event: "Augustine of Hippo died as Vandals besieged his city. He had ministered as bishop for 35 years." },
  "08-31": { year: 1688, event: "John Bunyan, the tinker-turned-preacher whose Pilgrim's Progress would become the second-best-selling book in English after the Bible, died in London." },

  // ── September ──
  "09-01": { year: 604, event: "Pope Gregory the Great died at Rome. He sent Augustine of Canterbury to evangelize England and reformed the liturgy that still bears his name." },
  "09-13": { year: 407, event: "John Chrysostom — the 'Golden-Mouthed' preacher — died in exile, having been banished by the empress for his blunt sermons against court luxury." },
  "09-14": { year: 258, event: "Cyprian of Carthage, bishop and theologian of church unity, was beheaded for his faith — kneeling and tipping the executioner 25 gold pieces." },
  "09-21": { year: 0, event: "Feast of Matthew the Apostle — tax collector turned evangelist, traditionally remembered on this day in the Western church." },
  "09-29": { year: 0, event: "Michaelmas — the feast of Michael and All Angels, observed across Western Christendom since at least the 5th century." },
  "09-30": { year: 420, event: "Jerome, translator of the Latin Vulgate Bible, died at Bethlehem after decades of scholarly labor in a cave near the Church of the Nativity." },

  // ── October ──
  "10-04": { year: 1226, event: "Francis of Assisi died at the Portiuncula chapel he had restored, age 44. He had asked to be laid on the bare ground for his final hours." },
  "10-09": { year: 1747, event: "David Brainerd, the consumptive missionary to the Native Americans whose journals shaped Edwards's view of revival, died in the Edwards household at age 29." },
  "10-16": { year: 1555, event: "Hugh Latimer and Nicholas Ridley were burned at Oxford. Latimer's last words to Ridley: 'Be of good comfort, and play the man, Master Ridley.'" },
  "10-18": { year: 0, event: "Feast of Luke the Evangelist — author of the Third Gospel and Acts, the only Gentile writer in the New Testament." },
  "10-21": { year: 1772, event: "Samuel Taylor Coleridge was born — the poet whose Aids to Reflection helped reintroduce Reformed thought to a generation of English readers." },
  "10-28": { year: 0, event: "Feast of Simon and Jude — two of the Twelve Apostles, jointly remembered on this day in the Western calendar." },
  "10-31": { year: 1517, event: "Martin Luther posted his Ninety-Five Theses to the door of the Castle Church at Wittenberg, lighting the fuse of the Reformation." },

  // ── November ──
  "11-01": { year: 0, event: "All Saints' Day — the Church's commemoration of all the faithful departed, fixed on this date by Pope Gregory III in the 8th century." },
  "11-02": { year: 0, event: "All Souls' Day — the Western church's commemoration of the faithful departed, established by Odilo of Cluny in 998." },
  "11-10": { year: 1483, event: "Martin Luther was born at Eisleben, Saxony — the son of a copper miner who would split Western Christendom." },
  "11-11": { year: 397, event: "Martin of Tours — the Roman soldier turned bishop who once cut his cloak in half to clothe a beggar — died at Candes." },
  "11-18": { year: 1626, event: "St. Peter's Basilica was consecrated in Rome after 120 years of construction." },
  "11-22": { year: 1963, event: "C. S. Lewis died at his Oxford home, the same day as Aldous Huxley and President John F. Kennedy. He was 64." },
  "11-29": { year: 1530, event: "Cardinal Thomas Wolsey, once the most powerful man in England under Henry VIII, died en route to face charges of treason." },
  "11-30": { year: 1554, event: "England was formally re-united with Rome under Mary I — a reconciliation that lasted only until her death four years later." },

  // ── December ──
  "12-06": { year: 343, event: "Nicholas of Myra — the historical figure behind St. Nicholas — died. Tradition holds he attended the Council of Nicaea." },
  "12-07": { year: 397, event: "Ambrose of Milan was consecrated bishop — eight days after his baptism, having been acclaimed bishop while still a catechumen and unbaptized governor." },
  "12-13": { year: 304, event: "Lucy of Syracuse, virgin martyr under Diocletian, was killed for her refusal to marry a pagan and her gifts to the poor of her dowry." },
  "12-19": { year: 1683, event: "John Owen, the great Puritan theologian and former vice-chancellor of Oxford, died near London at age 67." },
  "12-25": { year: 800, event: "Charlemagne was crowned Holy Roman Emperor by Pope Leo III in St. Peter's Basilica on Christmas Day." },
  "12-26": { year: 1873, event: "Phillips Brooks preached the sermon that would become his most famous Christmas hymn, 'O Little Town of Bethlehem.'" },
  "12-27": { year: 0, event: "Feast of John the Apostle and Evangelist — the 'beloved disciple,' traditionally remembered on this day in the Western church." },
  "12-29": { year: 1170, event: "Thomas Becket, Archbishop of Canterbury, was murdered in his cathedral by knights of Henry II — words from the king's hall taken as a royal command." },
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function mmdd(d) {
  return String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function ordinal(n) {
  if (n >= 11 && n <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

function monthDayLabel(d) {
  const day = d.getDate();
  return `${MONTHS[d.getMonth()]} ${day}${ordinal(day)}`;
}

export function findEventForDate(today) {
  const d = new Date(today);
  for (let i = 0; i < 30; i++) {
    const key = mmdd(d);
    if (HISTORY_BY_DATE[key]) {
      return {
        date: new Date(d),
        label: monthDayLabel(d),
        offset: i,
        ...HISTORY_BY_DATE[key],
      };
    }
    d.setDate(d.getDate() - 1);
  }
  return null;
}
