const { Odds, BettingMarket, Fixture, League, Team } = require('../models');
const { Op } = require('sequelize');
const apiFootballService = require('./apiFootballService');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

class OddsSyncService {
  constructor() {
    // 📊 MAPEO COMPLETO DE MERCADOS BASADO EN TU ids.json (SIN HANDICAPS)
    this.marketMapping = {
      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS PRINCIPALES - RESULTADO DEL PARTIDO
      // ═══════════════════════════════════════════════════════════════════
      
      // ID 1: Match Winner (1X2)
      1: {
        ourKey: '1X2',
        name: 'Match Winner',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW', 
          'Away': 'AWAY'
        }
      },
      
      // ID 2: Home/Away (sin empate)
      2: {
        ourKey: 'HOME_AWAY',
        name: 'Home/Away',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // ID 12: Double Chance
      12: {
        ourKey: 'DOUBLE_CHANCE',
        name: 'Double Chance',
        outcomes: {
          '1X': '1X',
          'X2': 'X2', 
          '12': '12'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS DE GOLES - TIEMPO COMPLETO
      // ═══════════════════════════════════════════════════════════════════
      
      // ID 5: Goals Over/Under (Principal 2.5)
      5: {
        ourKey: 'OVER_UNDER_2_5',
        name: 'Goals Over/Under',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 38: Exact Goals Number
      38: {
        ourKey: 'EXACT_GOALS_NUMBER',
        name: 'Exact Goals Number',
        outcomes: {
          '0': 'GOALS_0',
          '1': 'GOALS_1',
          '2': 'GOALS_2',
          '3': 'GOALS_3',
          '4': 'GOALS_4',
          '5': 'GOALS_5',
          '6+': 'GOALS_6_PLUS'
        }
      },

      // ID 8: Both Teams Score
      8: {
        ourKey: 'BTTS',
        name: 'Both Teams Score',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 10: Exact Score
      10: {
        ourKey: 'EXACT_SCORE',
        name: 'Exact Score',
        outcomes: {
          '0-0': '0_0',
          '1-0': '1_0',
          '0-1': '0_1',
          '1-1': '1_1',
          '2-0': '2_0',
          '0-2': '0_2',
          '2-1': '2_1',
          '1-2': '1_2',
          '2-2': '2_2',
          '3-0': '3_0',
          '0-3': '0_3',
          '3-1': '3_1',
          '1-3': '1_3',
          '3-2': '3_2',
          '2-3': '2_3',
          '3-3': '3_3',
          '4-0': '4_0',
          '0-4': '0_4',
          '4-1': '4_1',
          '1-4': '1_4',
          '4-2': '4_2',
          '2-4': '2_4',
          '4-3': '4_3',
          '3-4': '3_4',
          '4-4': '4_4',
          'Other': 'OTHER'
        }
      },

      // ID 47: Winning Margin
      47: {
        ourKey: 'WINNING_MARGIN',
        name: 'Winning Margin',
        outcomes: {
          'Home 1': 'HOME_1',
          'Home 2': 'HOME_2',
          'Home 3': 'HOME_3',
          'Home 4+': 'HOME_4_PLUS',
          'Away 1': 'AWAY_1',
          'Away 2': 'AWAY_2',
          'Away 3': 'AWAY_3',
          'Away 4+': 'AWAY_4_PLUS',
          'Draw': 'DRAW'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // PRIMER TIEMPO (HALFTIME)
      // ═══════════════════════════════════════════════════════════════════
      
      // ID 13: First Half Winner
      13: {
        ourKey: 'HT_1X2',
        name: 'First Half Winner',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ID 6: Goals Over/Under First Half
      6: {
        ourKey: 'HT_OVER_UNDER_1_5',
        name: 'Goals Over/Under First Half',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 34: Both Teams Score - First Half
      34: {
        ourKey: 'HT_BTTS',
        name: 'Both Teams Score - First Half',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 31: Correct Score - First Half
      31: {
        ourKey: 'HT_EXACT_SCORE',
        name: 'Correct Score - First Half',
        outcomes: {
          '0-0': '0_0',
          '1-0': '1_0',
          '0-1': '0_1',
          '1-1': '1_1',
          '2-0': '2_0',
          '0-2': '0_2',
          '2-1': '2_1',
          '1-2': '1_2',
          '2-2': '2_2',
          'Other': 'OTHER'
        }
      },

      // ID 20: Double Chance - First Half
      20: {
        ourKey: 'HT_DOUBLE_CHANCE',
        name: 'Double Chance - First Half',
        outcomes: {
          '1X': '1X',
          'X2': 'X2',
          '12': '12'
        }
      },

      // ID 46: Exact Goals Number - First Half
      46: {
        ourKey: 'HT_EXACT_GOALS',
        name: 'Exact Goals Number - First Half',
        outcomes: {
          '0': 'GOALS_0',
          '1': 'GOALS_1',
          '2': 'GOALS_2',
          '3': 'GOALS_3',
          '4+': 'GOALS_4_PLUS'
        }
      },

      // ID 22: Odd/Even - First Half
      22: {
        ourKey: 'HT_ODD_EVEN',
        name: 'Odd/Even - First Half',
        outcomes: {
          'Odd': 'ODD',
          'Even': 'EVEN'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // SEGUNDO TIEMPO
      // ═══════════════════════════════════════════════════════════════════

      // ID 3: Second Half Winner
      3: {
        ourKey: 'ST_1X2',
        name: 'Second Half Winner',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ID 26: Goals Over/Under - Second Half
      26: {
        ourKey: 'ST_OVER_UNDER_1_5',
        name: 'Goals Over/Under - Second Half',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 35: Both Teams To Score - Second Half
      35: {
        ourKey: 'ST_BTTS',
        name: 'Both Teams To Score - Second Half',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 33: Double Chance - Second Half
      33: {
        ourKey: 'ST_DOUBLE_CHANCE',
        name: 'Double Chance - Second Half',
        outcomes: {
          '1X': '1X',
          'X2': 'X2',
          '12': '12'
        }
      },

      // ID 62: Correct Score - Second Half
      62: {
        ourKey: 'ST_EXACT_SCORE',
        name: 'Correct Score - Second Half',
        outcomes: {
          '0-0': '0_0',
          '1-0': '1_0',
          '0-1': '0_1',
          '1-1': '1_1',
          '2-0': '2_0',
          '0-2': '0_2',
          'Other': 'OTHER'
        }
      },

      // ID 42: Second Half Exact Goals Number
      42: {
        ourKey: 'ST_EXACT_GOALS',
        name: 'Second Half Exact Goals Number',
        outcomes: {
          '0': 'GOALS_0',
          '1': 'GOALS_1',
          '2': 'GOALS_2',
          '3': 'GOALS_3',
          '4+': 'GOALS_4_PLUS'
        }
      },

      // ID 63: Odd/Even - Second Half
      63: {
        ourKey: 'ST_ODD_EVEN',
        name: 'Odd/Even - Second Half',
        outcomes: {
          'Odd': 'ODD',
          'Even': 'EVEN'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // CORNERS (ESQUINAS)
      // ═══════════════════════════════════════════════════════════════════
      
      // ID 45: Corners Over Under
      45: {
        ourKey: 'CORNERS_OVER_UNDER_8_5',
        name: 'Corners Over Under',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 55: Corners 1x2
      55: {
        ourKey: 'CORNERS_1X2',
        name: 'Corners 1x2',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ID 57: Home Corners Over/Under
      57: {
        ourKey: 'HOME_CORNERS_OVER_UNDER',
        name: 'Home Corners Over/Under',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 58: Away Corners Over/Under
      58: {
        ourKey: 'AWAY_CORNERS_OVER_UNDER',
        name: 'Away Corners Over/Under',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 85: Total Corners (3 way)
      85: {
        ourKey: 'TOTAL_CORNERS_3WAY',
        name: 'Total Corners (3 way)',
        outcomes: {
          'Under': 'UNDER',
          'Exact': 'EXACT',
          'Over': 'OVER'
        }
      },

      // ID 77: Total Corners (1st Half)
      77: {
        ourKey: 'HT_TOTAL_CORNERS',
        name: 'Total Corners (1st Half)',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // TARJETAS (CARDS)
      // ═══════════════════════════════════════════════════════════════════
      
      // ID 80: Cards Over/Under
      80: {
        ourKey: 'CARDS_OVER_UNDER_3_5',
        name: 'Cards Over/Under',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 82: Home Team Total Cards
      82: {
        ourKey: 'HOME_TEAM_CARDS',
        name: 'Home Team Total Cards',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 83: Away Team Total Cards
      83: {
        ourKey: 'AWAY_TEAM_CARDS',
        name: 'Away Team Total Cards',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 150: Home Team Yellow Cards
      150: {
        ourKey: 'HOME_YELLOW_CARDS',
        name: 'Home Team Yellow Cards',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 151: Away Team Yellow Cards
      151: {
        ourKey: 'AWAY_YELLOW_CARDS',
        name: 'Away Team Yellow Cards',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 153: Yellow Over/Under
      153: {
        ourKey: 'YELLOW_CARDS_TOTAL',
        name: 'Yellow Over/Under',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 86: Red Card
      86: {
        ourKey: 'RED_CARD',
        name: 'Red Card',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS ESPECIALES
      // ═══════════════════════════════════════════════════════════════════

      // ID 21: Odd/Even
      21: {
        ourKey: 'ODD_EVEN',
        name: 'Odd/Even',
        outcomes: {
          'Odd': 'ODD',
          'Even': 'EVEN'
        }
      },

      // ID 23: Home Odd/Even
      23: {
        ourKey: 'HOME_ODD_EVEN',
        name: 'Home Odd/Even',
        outcomes: {
          'Odd': 'ODD',
          'Even': 'EVEN'
        }
      },

      // ID 60: Away Odd/Even
      60: {
        ourKey: 'AWAY_ODD_EVEN',
        name: 'Away Odd/Even',
        outcomes: {
          'Odd': 'ODD',
          'Even': 'EVEN'
        }
      },

      // ID 14: Team To Score First
      14: {
        ourKey: 'FIRST_GOAL',
        name: 'Team To Score First',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // ID 15: Team To Score Last
      15: {
        ourKey: 'LAST_GOAL',
        name: 'Team To Score Last',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // ID 27: Clean Sheet - Home
      27: {
        ourKey: 'HOME_CLEAN_SHEET',
        name: 'Clean Sheet - Home',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 28: Clean Sheet - Away
      28: {
        ourKey: 'AWAY_CLEAN_SHEET',
        name: 'Clean Sheet - Away',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 29: Win to Nil - Home
      29: {
        ourKey: 'HOME_WIN_TO_NIL',
        name: 'Win to Nil - Home',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 30: Win to Nil - Away
      30: {
        ourKey: 'AWAY_WIN_TO_NIL',
        name: 'Win to Nil - Away',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 36: Win To Nil
      36: {
        ourKey: 'WIN_TO_NIL',
        name: 'Win To Nil',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // ID 43: Home Team Score a Goal
      43: {
        ourKey: 'HOME_TEAM_SCORE',
        name: 'Home Team Score a Goal',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 44: Away Team Score a Goal
      44: {
        ourKey: 'AWAY_TEAM_SCORE',
        name: 'Away Team Score a Goal',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 59: Own Goal
      59: {
        ourKey: 'OWN_GOAL',
        name: 'Own Goal',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS COMBINADOS
      // ═══════════════════════════════════════════════════════════════════

      // ID 7: HT/FT Double
      7: {
        ourKey: 'HT_FT',
        name: 'HT/FT Double',
        outcomes: {
          'Home/Home': 'HOME_HOME',
          'Home/Draw': 'HOME_DRAW',
          'Home/Away': 'HOME_AWAY',
          'Draw/Home': 'DRAW_HOME',
          'Draw/Draw': 'DRAW_DRAW',
          'Draw/Away': 'DRAW_AWAY',
          'Away/Home': 'AWAY_HOME',
          'Away/Draw': 'AWAY_DRAW',
          'Away/Away': 'AWAY_AWAY'
        }
      },

      // ID 24: Results/Both Teams Score
      24: {
        ourKey: 'RESULT_BTTS',
        name: 'Results/Both Teams Score',
        outcomes: {
          'Home/Yes': 'HOME_YES',
          'Home/No': 'HOME_NO',
          'Draw/Yes': 'DRAW_YES',
          'Draw/No': 'DRAW_NO',
          'Away/Yes': 'AWAY_YES',
          'Away/No': 'AWAY_NO'
        }
      },

      // ID 25: Result/Total Goals
      25: {
        ourKey: 'RESULT_TOTAL_GOALS',
        name: 'Result/Total Goals',
        outcomes: {
          'Home/Over': 'HOME_OVER',
          'Home/Under': 'HOME_UNDER',
          'Draw/Over': 'DRAW_OVER',
          'Draw/Under': 'DRAW_UNDER',
          'Away/Over': 'AWAY_OVER',
          'Away/Under': 'AWAY_UNDER'
        }
      },

      // ID 49: Total Goals/Both Teams To Score
      49: {
        ourKey: 'TOTAL_GOALS_BTTS',
        name: 'Total Goals/Both Teams To Score',
        outcomes: {
          'Over/Yes': 'OVER_YES',
          'Over/No': 'OVER_NO',
          'Under/Yes': 'UNDER_YES',
          'Under/No': 'UNDER_NO'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS DE TIEMPO ESPECÍFICO
      // ═══════════════════════════════════════════════════════════════════

      // ID 54: First 10 min Winner
      54: {
        ourKey: 'FIRST_10_MIN_WINNER',
        name: 'First 10 min Winner',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ID 136: 1x2 - 15 minutes
      136: {
        ourKey: '1X2_15_MIN',
        name: '1x2 - 15 minutes',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ID 139: 1x2 - 30 minutes
      139: {
        ourKey: '1X2_30_MIN',
        name: '1x2 - 30 minutes',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ID 137: 1x2 - 60 minutes
      137: {
        ourKey: '1X2_60_MIN',
        name: '1x2 - 60 minutes',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ID 138: 1x2 - 75 minutes
      138: {
        ourKey: '1X2_75_MIN',
        name: '1x2 - 75 minutes',
        outcomes: {
          'Home': 'HOME',
          'Draw': 'DRAW',
          'Away': 'AWAY'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS DE GOLES POR EQUIPO
      // ═══════════════════════════════════════════════════════════════════

      // ID 16: Total - Home
      16: {
        ourKey: 'HOME_TOTAL_GOALS',
        name: 'Total - Home',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 17: Total - Away
      17: {
        ourKey: 'AWAY_TOTAL_GOALS',
        name: 'Total - Away',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 40: Home Team Exact Goals Number
      40: {
        ourKey: 'HOME_EXACT_GOALS',
        name: 'Home Team Exact Goals Number',
        outcomes: {
          '0': 'GOALS_0',
          '1': 'GOALS_1',
          '2': 'GOALS_2',
          '3': 'GOALS_3',
          '4+': 'GOALS_4_PLUS'
        }
      },

      // ID 41: Away Team Exact Goals Number
      41: {
        ourKey: 'AWAY_EXACT_GOALS',
        name: 'Away Team Exact Goals Number',
        outcomes: {
          '0': 'GOALS_0',
          '1': 'GOALS_1',
          '2': 'GOALS_2',
          '3': 'GOALS_3',
          '4+': 'GOALS_4_PLUS'
        }
      },

      // ID 105: Home Team Total Goals(1st Half)
      105: {
        ourKey: 'HOME_HT_TOTAL_GOALS',
        name: 'Home Team Total Goals(1st Half)',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 106: Away Team Total Goals(1st Half)
      106: {
        ourKey: 'AWAY_HT_TOTAL_GOALS',
        name: 'Away Team Total Goals(1st Half)',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 107: Home Team Total Goals(2nd Half)
      107: {
        ourKey: 'HOME_ST_TOTAL_GOALS',
        name: 'Home Team Total Goals(2nd Half)',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ID 108: Away Team Total Goals(2nd Half)
      108: {
        ourKey: 'AWAY_ST_TOTAL_GOALS',
        name: 'Away Team Total Goals(2nd Half)',
        outcomes: {
          'Over': 'OVER',
          'Under': 'UNDER'
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // MERCADOS ESPECIALES AVANZADOS
      // ═══════════════════════════════════════════════════════════════════

      // ID 32: Win Both Halves
      32: {
        ourKey: 'WIN_BOTH_HALVES',
        name: 'Win Both Halves',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY',
          'Neither': 'NEITHER'
        }
      },

      // ID 37: Home win both halves
      37: {
        ourKey: 'HOME_WIN_BOTH_HALVES',
        name: 'Home win both halves',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 53: Away win both halves
      53: {
        ourKey: 'AWAY_WIN_BOTH_HALVES',
        name: 'Away win both halves',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 39: To Win Either Half
      39: {
        ourKey: 'WIN_EITHER_HALF',
        name: 'To Win Either Half',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY'
        }
      },

      // ID 48: To Score In Both Halves By Teams
      48: {
        ourKey: 'SCORE_BOTH_HALVES',
        name: 'To Score In Both Halves By Teams',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY',
          'Both': 'BOTH',
          'Neither': 'NEITHER'
        }
      },

      // ID 111: Home team will score in both halves
      111: {
        ourKey: 'HOME_SCORE_BOTH_HALVES',
        name: 'Home team will score in both halves',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 112: Away team will score in both halves
      112: {
        ourKey: 'AWAY_SCORE_BOTH_HALVES',
        name: 'Away team will score in both halves',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 113: Both Teams To Score in Both Halves
      113: {
        ourKey: 'BTTS_BOTH_HALVES',
        name: 'Both Teams To Score in Both Halves',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 110: Scoring Draw
      110: {
        ourKey: 'SCORING_DRAW',
        name: 'Scoring Draw',
        outcomes: {
          'Yes': 'YES',
          'No': 'NO'
        }
      },

      // ID 184: To Score in Both Halves
      184: {
        ourKey: 'TEAM_SCORE_BOTH_HALVES',
        name: 'To Score in Both Halves',
        outcomes: {
          'Home': 'HOME',
          'Away': 'AWAY',
          'Both': 'BOTH',
          'Neither': 'NEITHER'
        }
      }
    };

    // Bookmakers prioritarios
    this.priorityBookmakers = [
      'Bet365',
      'William Hill', 
      'Betfair',
      'Unibet',
      'Pinnacle',
      'Betway',
      '1xBet',
      'PokerStars',
      'Bwin'
    ];
  }

  // 📊 SINCRONIZAR ODDS DE UN FIXTURE - ✅ CORREGIDO PARA OBTENER TODAS LAS ODDS
  async syncFixtureOdds(fixtureApiId) {
    try {
      logger.info(`📊 Sincronizando odds para fixture ${fixtureApiId}...`);

      // Buscar fixture en nuestra BD
      const fixture = await Fixture.findOne({
        where: { apiFootballId: fixtureApiId },
        include: ['league', 'homeTeam', 'awayTeam']
      });

      if (!fixture) {
        throw new Error(`Fixture ${fixtureApiId} no encontrado en BD`);
      }

      // ✅ OBTENER TODAS LAS ODDS SIN LIMITAR BOOKMAKER
      logger.info(`📡 Solicitando TODAS las odds de API-Football para fixture ${fixtureApiId}...`);
      
      const response = await apiFootballService.makeRequest('/odds', {
        fixture: fixtureApiId
        // ✅ NO especificar bookmaker = obtiene TODAS las casas de apuestas
      });

      // ✅ DEBUG: Log detallado de la respuesta
      if (response.response && response.response.length > 0) {
        const oddsData = response.response[0];
        logger.info(`📊 ✅ RESPUESTA EXITOSA de API-Football:
          🎯 Fixture: ${oddsData.fixture.id}
          🏆 Liga: ${oddsData.league.name}
          📅 Fecha: ${oddsData.fixture.date}
          🎲 Total bookmakers: ${oddsData.bookmakers.length}
          📋 Bookmakers: ${oddsData.bookmakers.map(b => `${b.name}(ID:${b.id})`).join(', ')}`);
        
        // Log de mercados de los primeros bookmakers como ejemplo
        if (oddsData.bookmakers[0]) {
          const firstBookmaker = oddsData.bookmakers[0];
          logger.info(`📈 Ejemplo - ${firstBookmaker.name} tiene ${firstBookmaker.bets.length} mercados:
            ${firstBookmaker.bets.map(bet => `${bet.name}(ID:${bet.id})`).slice(0, 5).join(', ')}${firstBookmaker.bets.length > 5 ? '...' : ''}`);
        }

        if (oddsData.bookmakers.length > 1 && oddsData.bookmakers[1]) {
          const secondBookmaker = oddsData.bookmakers[1];
          logger.info(`📈 Ejemplo 2 - ${secondBookmaker.name} tiene ${secondBookmaker.bets.length} mercados`);
        }
      } else {
        logger.warn(`⚠️ ❌ NO SE RECIBIERON ODDS de API-Football para fixture ${fixtureApiId}`);
        logger.warn(`📄 Respuesta API completa:`, JSON.stringify(response, null, 2));
        
        // Verificar si es problema de rate limit o fixture inexistente
        if (response.errors && response.errors.length > 0) {
          logger.error(`🚨 ERRORES DE API-Football:`, response.errors);
        }
        
        // Verificar rate limit info
        if (response.paging) {
          logger.info(`📊 Rate limit info - Current: ${response.paging.current}, Total: ${response.paging.total}`);
        }
      }

      if (!response.response || response.response.length === 0) {
        logger.warn(`❌ No hay odds disponibles para fixture ${fixtureApiId}`);
        return { created: 0, updated: 0, errors: 0, message: 'No odds available' };
      }

      const results = { created: 0, updated: 0, errors: 0, markets: 0, bookmakers: 0 };

      for (const oddsData of response.response) {
        results.bookmakers += oddsData.bookmakers.length;
        
        try {
          for (const bookmaker of oddsData.bookmakers) {
            logger.debug(`🏪 Procesando bookmaker: ${bookmaker.name} (${bookmaker.bets.length} mercados)`);
            
            for (const bet of bookmaker.bets) {
              const processResult = await this.processOddsData(
                fixture.id,
                bookmaker.name,
                bet
              );
              
              if (processResult.created) results.created += processResult.created;
              if (processResult.updated) results.updated += processResult.updated;
              if (processResult.errors) results.errors += processResult.errors;
              
              results.markets++;
            }
          }
        } catch (error) {
          logger.error(`❌ Error procesando odds de bookmaker:`, error.message);
          results.errors++;
        }
      }

      // Calcular odds promedio
      logger.info(`🧮 Calculando odds promedio para fixture ${fixture.id}...`);
      await this.calculateAverageOdds(fixture.id);

      const successMessage = `✅ ODDS SINCRONIZADOS EXITOSAMENTE para ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}:
        🎲 ${results.bookmakers} bookmakers procesados
        📈 ${results.created + results.updated} odds guardadas (${results.created} nuevas, ${results.updated} actualizadas)
        🎯 ${results.markets} mercados procesados
        ❌ ${results.errors} errores`;
      
      logger.info(successMessage);
      return results;

    } catch (error) {
      logger.error(`❌ ERROR CRÍTICO sincronizando odds para fixture ${fixtureApiId}:`, error);
      
      // ✅ DEBUG: Información adicional del error
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        logger.error('🚨 RATE LIMIT ALCANZADO - Verifica tu plan de API-Football');
        logger.error('💡 Solución: Espera o actualiza tu plan en RapidAPI');
      } else if (error.message.includes('Not Found') || error.message.includes('404')) {
        logger.error('🔍 FIXTURE NO ENCONTRADO en API-Football - Verifica el ID del fixture');
        logger.error(`💡 Solución: Verifica que el fixture ${fixtureApiId} existe en API-Football`);
      } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        logger.error('🔑 ERROR DE AUTENTICACIÓN - Verifica tu API_FOOTBALL_KEY');
        logger.error('💡 Solución: Revisa tu API key en el archivo .env');
      } else if (error.message.includes('ECONNREFUSED')) {
        logger.error('🌐 ERROR DE CONEXIÓN - Verifica tu conexión a internet');
      } else {
        logger.error(`🔧 Error desconocido: ${error.message}`);
        logger.error('📄 Stack trace:', error.stack);
      }
      
      throw error;
    }
  }

  // Procesar datos de odds individuales
  async processOddsData(fixtureId, bookmakerName, betData) {
    try {
      const marketMapping = this.marketMapping[betData.id];
      
      if (!marketMapping) {
        // Mercado no soportado - log para debug
        logger.debug(`⚠️ Mercado no soportado: ${betData.id} - ${betData.name}`);
        return { skipped: true };
      }

      // Buscar nuestro mercado
      const market = await BettingMarket.findOne({
        where: { key: marketMapping.ourKey }
      });

      if (!market) {
        logger.warn(`❌ Mercado ${marketMapping.ourKey} no encontrado en BD`);
        return { skipped: true, message: `Market ${marketMapping.ourKey} not found` };
      }

      const results = { created: 0, updated: 0, errors: 0 };

      // Procesar cada valor de odds
      for (const value of betData.values) {
        const outcome = marketMapping.outcomes[value.value];
        
        if (!outcome) {
          logger.debug(`⚠️ Outcome no mapeado: ${value.value} en mercado ${marketMapping.ourKey}`);
          continue;
        }

        try {
          // Datos de la odd
          const oddData = {
            fixtureId,
            marketId: market.id,
            bookmaker: bookmakerName,
            outcome,
            value: this.extractNumericValue(value.value), // Extraer valor numérico si aplica
            odds: parseFloat(value.odd),
            impliedProbability: this.calculateImpliedProbability(parseFloat(value.odd)),
            isActive: true,
            lastUpdated: new Date()
          };

          // Crear o actualizar odd
          const [odd, created] = await Odds.findOrCreate({
            where: {
              fixtureId,
              marketId: market.id,
              outcome,
              bookmaker: bookmakerName
            },
            defaults: oddData
          });

          if (!created) {
            await odd.update(oddData);
            results.updated++;
          } else {
            results.created++;
          }

        } catch (oddError) {
          logger.error(`❌ Error procesando odd individual: ${oddError.message}`);
          results.errors++;
        }
      }

      return results;

    } catch (error) {
      logger.error('❌ Error procesando odd individual:', error);
      return { errors: 1, message: error.message };
    }
  }

  // Calcular odds promedio para un fixture
  async calculateAverageOdds(fixtureId) {
    try {
      const markets = await BettingMarket.findAll();
      
      for (const market of markets) {
        // Obtener todas las odds de este mercado para el fixture
        const odds = await Odds.findAll({
          where: {
            fixtureId,
            marketId: market.id,
            isActive: true,
            bookmaker: { [Op.ne]: 'Average' } // Excluir Average para evitar bucle
          }
        });

        // Agrupar por outcome
        const outcomeGroups = {};
        odds.forEach(odd => {
          if (!outcomeGroups[odd.outcome]) {
            outcomeGroups[odd.outcome] = [];
          }
          outcomeGroups[odd.outcome].push(odd.odds);
        });

        // Calcular promedio para cada outcome
        for (const [outcome, oddsList] of Object.entries(outcomeGroups)) {
          if (oddsList.length === 0) continue;
          
          const avgOdds = oddsList.reduce((sum, odd) => sum + parseFloat(odd), 0) / oddsList.length;
          const avgImpliedProb = this.calculateImpliedProbability(avgOdds);

          // Crear/actualizar odd promedio
          const [averageOdd, created] = await Odds.findOrCreate({
            where: {
              fixtureId,
              marketId: market.id,
              outcome,
              bookmaker: 'Average'
            },
            defaults: {
              fixtureId,
              marketId: market.id,
              bookmaker: 'Average',
              outcome,
              value: null,
              odds: parseFloat(avgOdds.toFixed(2)),
              impliedProbability: parseFloat(avgImpliedProb.toFixed(2)),
              isActive: true,
              lastUpdated: new Date()
            }
          });

          if (!created) {
            await averageOdd.update({
              odds: parseFloat(avgOdds.toFixed(2)),
              impliedProbability: parseFloat(avgImpliedProb.toFixed(2)),
              lastUpdated: new Date()
            });
          }
        }
      }

    } catch (error) {
      logger.error('❌ Error calculando odds promedio:', error);
    }
  }

  // 🎯 SINCRONIZAR ODDS DE FIXTURES HOY (solo ligas top)
  async syncTodayOdds() {
    try {
      logger.info('🎯 Sincronizando odds de fixtures de hoy (ligas top)...');

      // Buscar fixtures de hoy de ligas con prioridad >= 80
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const fixtures = await Fixture.findAll({
        where: {
          fixtureDate: { [Op.between]: [startOfDay, endOfDay] },
          status: { [Op.in]: ['NS', '1H', 'HT', '2H'] } // Solo fixtures activos
        },
        include: [
          {
            model: League,
            as: 'league',
            where: { priority: { [Op.gte]: 80 } }, // Solo ligas importantes
            attributes: ['id', 'name', 'priority']
          }
        ],
        limit: 20 // Limitar para no gastar muchas requests
      });

      if (fixtures.length === 0) {
        logger.info('ℹ️ No hay fixtures de ligas top para sincronizar odds hoy');
        return { totalFixtures: 0, totalOdds: 0 };
      }

      logger.info(`📊 Encontrados ${fixtures.length} fixtures de ligas top para sincronizar`);

      const results = {
        totalFixtures: fixtures.length,
        totalOdds: 0,
        errors: 0,
        processed: 0
      };

      for (const fixture of fixtures) {
        try {
          logger.info(`🔄 [${results.processed + 1}/${fixtures.length}] Procesando fixture: ${fixture.homeTeam?.name || 'Home'} vs ${fixture.awayTeam?.name || 'Away'}`);
          
          // Pausa para rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre requests
          
          const oddsResult = await this.syncFixtureOdds(fixture.apiFootballId);
          results.totalOdds += oddsResult.created + oddsResult.updated;
          results.processed++;
          
        } catch (error) {
          logger.error(`❌ Error sincronizando odds de fixture ${fixture.apiFootballId}: ${error.message}`);
          results.errors++;
          results.processed++;
          
          // Si es rate limit, detener el proceso
          if (error.message.includes('Rate limit') || error.message.includes('429')) {
            logger.error('🚨 RATE LIMIT ALCANZADO - Deteniendo sincronización');
            break;
          }
        }
      }

      const summaryMessage = `✅ SINCRONIZACIÓN DE ODDS COMPLETADA:
        📊 ${results.totalOdds} odds de ${results.processed}/${results.totalFixtures} fixtures
        ❌ ${results.errors} errores`;
      
      logger.info(summaryMessage);
      return results;

    } catch (error) {
      logger.error('❌ Error en sincronización de odds de hoy:', error);
      throw error;
    }
  }

  // 📈 OBTENER ODDS DE UN FIXTURE
  async getFixtureOdds(fixtureId, bookmaker = 'Average') {
    try {
      const cacheKey = `odds:fixture:${fixtureId}:${bookmaker}`;
      
      // Intentar obtener del cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`📦 Cache hit para odds fixture ${fixtureId}`);
        return cached;
      }

      const odds = await Odds.findAll({
        where: {
          fixtureId,
          bookmaker,
          isActive: true
        },
        include: [
          {
            model: BettingMarket,
            as: 'market',
            attributes: ['id', 'key', 'name', 'category', 'possibleOutcomes']
          }
        ],
        order: [['market', 'priority', 'DESC']]
      });

      // Agrupar por mercado
      const groupedOdds = {};
      odds.forEach(odd => {
        const marketKey = odd.market.key;
        
        if (!groupedOdds[marketKey]) {
          groupedOdds[marketKey] = {
            market: {
              id: odd.market.id,
              key: odd.market.key,
              name: odd.market.name,
              category: odd.market.category,
              possibleOutcomes: odd.market.possibleOutcomes
            },
            odds: {}
          };
        }
        
        groupedOdds[marketKey].odds[odd.outcome] = {
          value: odd.value,
          odds: parseFloat(odd.odds),
          impliedProbability: parseFloat(odd.impliedProbability),
          lastUpdated: odd.lastUpdated
        };
      });

      const result = {
        fixtureId,
        bookmaker,
        markets: groupedOdds,
        lastSync: new Date().toISOString()
      };

      // Guardar en cache por 5 minutos
      await cacheService.set(cacheKey, result, 300);
      
      return result;

    } catch (error) {
      logger.error(`❌ Error obteniendo odds de fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  // 📊 OBTENER MEJORES ODDS DE UN FIXTURE
  async getBestOdds(fixtureId) {
    try {
      const cacheKey = `odds:best:${fixtureId}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const markets = await BettingMarket.findAll({
        where: { isActive: true },
        order: [['priority', 'DESC']]
      });

      const bestOdds = {};

      for (const market of markets) {
        const odds = await Odds.findAll({
          where: {
            fixtureId,
            marketId: market.id,
            isActive: true,
            bookmaker: { [Op.ne]: 'Average' }
          }
        });

        const outcomeGroups = {};
        odds.forEach(odd => {
          if (!outcomeGroups[odd.outcome]) {
            outcomeGroups[odd.outcome] = [];
          }
          outcomeGroups[odd.outcome].push({
            odds: parseFloat(odd.odds),
            bookmaker: odd.bookmaker,
            lastUpdated: odd.lastUpdated
          });
        });

        // Encontrar mejores odds para cada outcome
        const marketBest = {};
        for (const [outcome, oddsList] of Object.entries(outcomeGroups)) {
          const best = oddsList.reduce((max, current) => 
            current.odds > max.odds ? current : max
          );
          marketBest[outcome] = best;
        }

        if (Object.keys(marketBest).length > 0) {
          bestOdds[market.key] = {
            market: {
              id: market.id,
              key: market.key,
              name: market.name,
              category: market.category
            },
            bestOdds: marketBest
          };
        }
      }

      const result = {
        fixtureId,
        bestOdds,
        lastSync: new Date().toISOString()
      };

      // Cache por 2 minutos
      await cacheService.set(cacheKey, result, 120);
      
      return result;

    } catch (error) {
      logger.error(`❌ Error obteniendo mejores odds de fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  // Utilidades
  calculateImpliedProbability(odds) {
    return (1 / odds) * 100;
  }

  extractNumericValue(value) {
    const match = value.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  // Obtener estadísticas de odds
  async getOddsStats() {
    try {
      const stats = await Odds.findAll({
        attributes: [
          'bookmaker',
          [Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'count'],
          [Odds.sequelize.fn('MAX', Odds.sequelize.col('last_updated')), 'lastUpdate']
        ],
        group: ['bookmaker'],
        order: [[Odds.sequelize.fn('COUNT', Odds.sequelize.col('id')), 'DESC']]
      });

      return {
        bookmakers: stats,
        totalOdds: stats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0),
        lastUpdate: stats.length > 0 ? stats[0].dataValues.lastUpdate : null
      };

    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas de odds:', error);
      throw error;
    }
  }

  // 🆕 OBTENER MERCADOS DISPONIBLES PARA UN FIXTURE
  async getAvailableMarkets(fixtureId) {
    try {
      const markets = await Odds.findAll({
        where: { fixtureId, isActive: true },
        attributes: ['marketId'],
        group: ['marketId'],
        include: [
          {
            model: BettingMarket,
            as: 'market',
            attributes: ['key', 'name', 'category']
          }
        ]
      });

      return markets.map(odd => ({
        key: odd.market.key,
        name: odd.market.name,
        category: odd.market.category
      }));

    } catch (error) {
      logger.error('❌ Error obteniendo mercados disponibles:', error);
      return [];
    }
  }
}

module.exports = new OddsSyncService();