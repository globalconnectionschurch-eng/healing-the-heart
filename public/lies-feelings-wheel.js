(() => {
  const wheelData = [
    { id: 'root', name: 'Feelings' },

    { id: 'Happy', parent: 'root', name: 'Happy' },
    { id: 'Sad', parent: 'root', name: 'Sad' },
    { id: 'Angry', parent: 'root', name: 'Angry' },
    { id: 'Fearful', parent: 'root', name: 'Fearful' },
    { id: 'Bad', parent: 'root', name: 'Bad' },
    { id: 'Surprised', parent: 'root', name: 'Surprised' },
    { id: 'Disgusted', parent: 'root', name: 'Disgusted' },

    { id: 'Content', parent: 'Happy', name: 'Content' },
    { id: 'Optimistic', parent: 'Happy', name: 'Optimistic' },
    { id: 'Joyful', parent: 'Happy', name: 'Joyful' },

    { id: 'Lonely', parent: 'Sad', name: 'Lonely' },
    { id: 'Guilty', parent: 'Sad', name: 'Guilty' },
    { id: 'Hurt', parent: 'Sad', name: 'Hurt' },

    { id: 'Frustrated', parent: 'Angry', name: 'Frustrated' },
    { id: 'Hostile', parent: 'Angry', name: 'Hostile' },
    { id: 'Irritated', parent: 'Angry', name: 'Irritated' },

    { id: 'Scared', parent: 'Fearful', name: 'Scared' },
    { id: 'Anxious', parent: 'Fearful', name: 'Anxious' },
    { id: 'Insecure', parent: 'Fearful', name: 'Insecure' },

    { id: 'Tired', parent: 'Bad', name: 'Tired' },
    { id: 'Stressed', parent: 'Bad', name: 'Stressed' },
    { id: 'Bored', parent: 'Bad', name: 'Bored' },

    { id: 'Amazed', parent: 'Surprised', name: 'Amazed' },
    { id: 'Confused', parent: 'Surprised', name: 'Confused' },
    { id: 'Startled', parent: 'Surprised', name: 'Startled' },

    { id: 'Aversion', parent: 'Disgusted', name: 'Aversion' },
    { id: 'Contempt', parent: 'Disgusted', name: 'Contempt' },
    { id: 'Repulsed', parent: 'Disgusted', name: 'Repulsed' },

    { name: 'Peaceful', parent: 'Content', value: 1 },
    { name: 'Satisfied', parent: 'Content', value: 1 },
    { name: 'Hopeful', parent: 'Optimistic', value: 1 },
    { name: 'Inspired', parent: 'Optimistic', value: 1 },
    { name: 'Elated', parent: 'Joyful', value: 1 },
    { name: 'Playful', parent: 'Joyful', value: 1 },

    { name: 'Isolated', parent: 'Lonely', value: 1 },
    { name: 'Abandoned', parent: 'Lonely', value: 1 },
    { name: 'Ashamed', parent: 'Guilty', value: 1 },
    { name: 'Regretful', parent: 'Guilty', value: 1 },
    { name: 'Broken', parent: 'Hurt', value: 1 },
    { name: 'Betrayed', parent: 'Hurt', value: 1 },

    { name: 'Annoyed', parent: 'Irritated', value: 1 },
    { name: 'Agitated', parent: 'Irritated', value: 1 },
    { name: 'Resentful', parent: 'Frustrated', value: 1 },
    { name: 'Impatient', parent: 'Frustrated', value: 1 },
    { name: 'Aggressive', parent: 'Hostile', value: 1 },
    { name: 'Jealous', parent: 'Hostile', value: 1 },

    { name: 'Terrified', parent: 'Scared', value: 1 },
    { name: 'Helpless', parent: 'Scared', value: 1 },
    { name: 'Worried', parent: 'Anxious', value: 1 },
    { name: 'Overwhelmed', parent: 'Anxious', value: 1 },
    { name: 'Inadequate', parent: 'Insecure', value: 1 },
    { name: 'Inferior', parent: 'Insecure', value: 1 },

    { name: 'Exhausted', parent: 'Tired', value: 1 },
    { name: 'Sleepy', parent: 'Tired', value: 1 },
    { name: 'Pressured', parent: 'Stressed', value: 1 },
    { name: 'Frazzled', parent: 'Stressed', value: 1 },
    { name: 'Apathetic', parent: 'Bored', value: 1 },
    { name: 'Uninterested', parent: 'Bored', value: 1 },

    { name: 'Awe', parent: 'Amazed', value: 1 },
    { name: 'Wonder', parent: 'Amazed', value: 1 },
    { name: 'Perplexed', parent: 'Confused', value: 1 },
    { name: 'Puzzled', parent: 'Confused', value: 1 },
    { name: 'Shocked', parent: 'Startled', value: 1 },
    { name: 'Alarmed', parent: 'Startled', value: 1 },

    { name: 'Grossed out', parent: 'Aversion', value: 1 },
    { name: 'Nauseated', parent: 'Aversion', value: 1 },
    { name: 'Dismissive', parent: 'Contempt', value: 1 },
    { name: 'Judgmental', parent: 'Contempt', value: 1 },
    { name: 'Sickened', parent: 'Repulsed', value: 1 },
    { name: 'Offended', parent: 'Repulsed', value: 1 }
  ];

  const feelingDescriptions = {
    Happy:'Positive emotion of pleasure and well-being.',
    Content:'Calm satisfaction with the present.',
    Peaceful:'A settled, undisturbed calm.',
    Satisfied:'Needs or expectations feel met.',
    Optimistic:'Expectation of good outcomes.',
    Hopeful:'Confident desire for a positive future.',
    Inspired:'Energized by ideas or examples.',
    Joyful:'Strong delight or gladness.',
    Elated:'Intensely joyful; uplifted.',
    Playful:'Light-hearted; eager for fun.',
    Sad:'Low mood from loss or disappointment.',
    Lonely:'Feeling disconnected from others.',
    Isolated:'Cut off or apart from people.',
    Abandoned:'Left behind or uncared for.',
    Guilty:'Remorse for perceived wrongs.',
    Ashamed:'Painful awareness of falling short.',
    Regretful:'Wishing a past action were different.',
    Hurt:'Emotional pain from loss or injury.',
    Broken:'Deeply wounded; diminished.',
    Betrayed:'Harmed by someone you trusted.',
    Angry:'Emotion toward perceived wrong or blockage.',
    Irritated:'Light anger from minor annoyances.',
    Annoyed:'Mildly bothered or displeased.',
    Agitated:'Stirred up; unable to settle.',
    Frustrated:'Blocked from goals; thwarted.',
    Resentful:'Lingering bitterness over unfairness.',
    Impatient:'Restless with delays or obstacles.',
    Hostile:'Openly antagonistic or aggressive.',
    Aggressive:'Inclined to attack or dominate.',
    Jealous:'Threatened by another’s advantage.',
    Fearful:'Sense of threat or danger.',
    Scared:'Afraid of harm or danger.',
    Terrified:'Overwhelmed by fear.',
    Helpless:'Feeling unable to influence events.',
    Anxious:'Uneasy about uncertainty.',
    Worried:'Preoccupied with potential problems.',
    Overwhelmed:'Emotionally overloaded; underwater.',
    Insecure:'Lacking confidence or safety.',
    Inadequate:'Not enough to meet the demand.',
    Inferior:'Less capable or worthy than others.',
    Bad:'General, undifferentiated discomfort.',
    Tired:'Low energy; needing rest.',
    Exhausted:'Severely drained of energy.',
    Sleepy:'Ready to sleep; drowsy.',
    Stressed:'Under pressure; stretched thin.',
    Pressured:'Forces pushing you to act/perform.',
    Frazzled:'Frayed nerves from prolonged stress.',
    Bored:'Unstimulated and uninterested.',
    Apathetic:'Lacking motivation or concern.',
    Uninterested:'No desire to engage.',
    Surprised:'Something unexpected has occurred.',
    Amazed:'Struck by wonder or greatness.',
    Awe:'Humbled by vastness or beauty.',
    Wonder:'Curious admiration; marveling.',
    Confused:'Uncertain what something means.',
    Perplexed:'Deeply puzzled or baffled.',
    Puzzled:'Momentarily unsure how to proceed.',
    Startled:'Brief jolt from the unexpected.',
    Shocked:'Strong sudden surprise; jarring.',
    Alarmed:'Alerted to possible danger.',
    Disgusted:'Strong revulsion or aversion.',
    Aversion:'Strong desire to avoid.',
    'Grossed out':'Repelled by something icky.',
    Nauseated:'Feeling sick or queasy.',
    Contempt:'Looking down on as beneath you.',
    Dismissive:'Treating as unworthy of attention.',
    Judgmental:'Harshly critical of others.',
    Repulsed:'Driven back by strong dislike.',
    Sickened:'Physically/emotionally revolted.',
    Offended:'Feeling insulted or disrespected.'
  };

  let wheelChart = null;

  function updatePanel(point) {
    const panel = document.getElementById('feeling-panel');
    if (!panel) return;
    if (!point || !point.name) {
      panel.innerHTML = '<strong>Hover or tap a feeling</strong><div>A brief definition will appear here.</div>';
      return;
    }
    const name = point.name;
    const desc = feelingDescriptions[name] || '';
    panel.innerHTML = '<strong>' + name + '</strong>' + (desc ? '<div>' + desc + '</div>' : '');
  }

  window.initHthFeelingsWheel = function initHthFeelingsWheel() {
    if (wheelChart) {
      setTimeout(() => wheelChart.reflow(), 30);
      return wheelChart;
    }
    const target = document.getElementById('feelings-wheel');
    if (!target || !window.Highcharts) return null;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const chartHeight = isMobile
      ? Math.max(300, Math.round(target.getBoundingClientRect().width))
      : '100%';

    wheelChart = window.Highcharts.chart('feelings-wheel', {
      chart: {
        height: chartHeight,
        backgroundColor: 'transparent',
        spacing: isMobile ? [4, 4, 4, 4] : [10, 10, 10, 10]
      },
      title: { text: '' },
      breadcrumbs: {
        enabled: isMobile,
        floating: false,
        position: { align: 'left' },
        buttonTheme: {
          style: { fontSize: '11px', fontWeight: '700', color: '#4d5953' }
        }
      },
      series: [{
        type: 'sunburst',
        data: wheelData,
        allowDrillToNode: isMobile,
        cursor: 'pointer',
        point: {
          events: {
            mouseOver: function () { updatePanel(this); },
            click: function () { updatePanel(this); }
          }
        },
        dataLabels: {
          rotationMode: 'auto',
          filter: { property: 'innerArcLength', operator: '>', value: isMobile ? 22 : 16 },
          style: {
            fontSize: isMobile ? '9px' : '12px',
            fontWeight: '600',
            textOutline: 'none',
            color: '#202522'
          }
        },
        levels: [
          {
            level: 1,
            levelIsConstant: true,
            dataLabels: {
              style: {
                fontSize: isMobile ? '10px' : '14px',
                fontWeight: '800',
                textOutline: 'none',
                color: '#202522'
              }
            }
          },
          {
            level: 2,
            colorByPoint: true,
            dataLabels: {
              style: {
                fontSize: isMobile ? '10px' : '12px',
                fontWeight: '700',
                textOutline: 'none',
                color: '#202522'
              }
            }
          },
          {
            level: 3,
            dataLabels: {
              style: {
                fontSize: isMobile ? '9px' : '12px',
                textOutline: 'none',
                color: '#202522'
              }
            }
          },
          {
            level: 4,
            dataLabels: {
              style: {
                fontSize: isMobile ? '8px' : '12px',
                textOutline: 'none',
                color: '#202522'
              }
            }
          }
        ]
      }],
      tooltip: { enabled: false },
      credits: { enabled: false }
    });

    if (isMobile) {
      const resizeWheel = () => {
        if (!wheelChart) return;
        const width = target.getBoundingClientRect().width;
        if (width > 0) wheelChart.setSize(null, Math.max(300, Math.round(width)), false);
      };
      window.addEventListener('resize', resizeWheel, { passive: true });
    }

    return wheelChart;
  };
})();