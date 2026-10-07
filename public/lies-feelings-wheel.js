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
  let mobilePath = [];

  const coreColors = {
    Happy: '#12d98a',
    Sad: '#f4df00',
    Angry: '#ff6b35',
    Fearful: '#6b8fc2',
    Bad: '#c65ee9',
    Surprised: '#38d0c3',
    Disgusted: '#ff5147'
  };

  function childrenOf(parent) {
    return wheelData.filter((item) => item.parent === parent);
  }

  function descriptionFor(name) {
    return feelingDescriptions[name] || 'Notice whether this word feels close to what is happening inside.';
  }

  function coreFor(name) {
    let current = wheelData.find((item) => item.id === name || item.name === name);
    let guard = 0;
    while (current && current.parent && current.parent !== 'root' && guard < 10) {
      current = wheelData.find((item) => item.id === current.parent || item.name === current.parent);
      guard += 1;
    }
    return current && current.parent === 'root' ? current.name : name;
  }

  function useFeeling(name) {
    const tab = document.querySelector('[data-tab="tool"]');
    if (tab) tab.click();

    setTimeout(() => {
      const input = document.getElementById('mainText');
      if (!input) return;
      if (!input.value.trim()) {
        input.value = "I'm feeling " + name.toLowerCase() + " because ";
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
  }

  function renderFinalFeeling(name) {
    const picker = document.getElementById('mobile-feelings-picker');
    if (!picker) return;
    const color = coreColors[coreFor(name)] || '#d66b32';
    const trail = mobilePath.concat(name).filter((item, index, arr) => arr.indexOf(item) === index);

    picker.innerHTML =
      '<div class="mobile-picker-shell">' +
        '<div class="mobile-feeling-result" style="--feeling-color:' + color + '">' +
          '<p class="mobile-picker-kicker">This feels closest</p>' +
          '<h3>' + name + '</h3>' +
          '<p>' + descriptionFor(name) + '</p>' +
          '<div class="mobile-picker-trail" style="margin-top:1rem">' +
            trail.map((item) => '<span>' + item + '</span>').join('') +
          '</div>' +
          '<div class="mobile-result-actions">' +
            '<button type="button" class="button primary" data-use-feeling="' + name + '">Use this feeling in the healing tool →</button>' +
            '<button type="button" class="mobile-reset-button" data-reset-feelings>Choose another feeling</button>' +
          '</div>' +
        '</div>' +
        '<p class="mobile-picker-note">You do not have to get the word perfectly right. Choose the one that feels closest.</p>' +
      '</div>';

    picker.querySelector('[data-use-feeling]')?.addEventListener('click', () => useFeeling(name));
    picker.querySelector('[data-reset-feelings]')?.addEventListener('click', () => {
      mobilePath = [];
      renderMobilePicker();
    });
  }

  function renderMobilePicker() {
    const picker = document.getElementById('mobile-feelings-picker');
    if (!picker) return;

    const step = mobilePath.length + 1;
    let options = [];
    let title = '';
    let help = '';

    if (step === 1) {
      options = childrenOf('root');
      title = 'What feels closest right now?';
      help = "Don't overthink it. Start with the broad feeling that is nearest to what you feel.";
    } else if (step === 2) {
      options = childrenOf(mobilePath[0]);
      title = 'What kind of ' + mobilePath[0].toLowerCase() + '?';
      help = 'Pick the word that feels closest. We can make it more specific next.';
    } else {
      options = childrenOf(mobilePath[1]);
      title = 'Which word fits best?';
      help = 'You can choose the middle feeling itself, or one of the more specific words below.';
    }

    const progress =
      '<div class="mobile-picker-progress">' +
        [1, 2, 3].map((n) => '<span class="' + (n <= step ? 'active' : '') + '"></span>').join('') +
      '</div>';

    const trail = mobilePath.length
      ? '<div class="mobile-picker-trail">' + mobilePath.map((item) => '<span>' + item + '</span>').join('') + '</div>'
      : '';

    const color = coreColors[mobilePath[0]] || '#d66b32';

    let optionItems = options.slice();
    if (step === 3 && mobilePath[1]) {
      optionItems = [{ name: mobilePath[1], keepCurrent: true }].concat(optionItems);
    }

    const cards = optionItems.map((item) => {
      const name = item.name;
      const itemColor = coreColors[coreFor(name)] || color;
      const label = item.keepCurrent ? 'This word fits already' : descriptionFor(name);
      return '<button type="button" class="mobile-feeling-choice" data-feeling-choice="' + name + '" data-keep-current="' + (item.keepCurrent ? '1' : '0') + '" style="--feeling-color:' + itemColor + '">' +
        '<strong>' + name + '</strong>' +
        '<small>' + label + '</small>' +
      '</button>';
    }).join('');

    picker.innerHTML =
      '<div class="mobile-picker-shell">' +
        progress +
        '<p class="mobile-picker-kicker">Step ' + step + ' of 3</p>' +
        '<h2 class="mobile-picker-title">' + title + '</h2>' +
        '<p class="mobile-picker-help">' + help + '</p>' +
        trail +
        '<div class="mobile-feeling-grid">' + cards + '</div>' +
        (step > 1 ? '<button type="button" class="mobile-picker-back" data-feeling-back>← Back one step</button>' : '') +
        '<p class="mobile-picker-note">Start broad and move toward the word that feels most accurate.</p>' +
      '</div>';

    picker.querySelectorAll('[data-feeling-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        const name = button.getAttribute('data-feeling-choice');
        const keepCurrent = button.getAttribute('data-keep-current') === '1';
        if (!name) return;

        if (step === 3 || keepCurrent) {
          renderFinalFeeling(name);
          return;
        }

        mobilePath.push(name);
        renderMobilePicker();
      });
    });

    picker.querySelector('[data-feeling-back]')?.addEventListener('click', () => {
      mobilePath.pop();
      renderMobilePicker();
    });
  }

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
    const isMobile = window.matchMedia('(max-width: 800px)').matches;
    if (isMobile) {
      renderMobilePicker();
      return null;
    }

    if (wheelChart) {
      setTimeout(() => wheelChart.reflow(), 30);
      return wheelChart;
    }

    const target = document.getElementById('feelings-wheel');
    if (!target || !window.Highcharts) return null;

    wheelChart = window.Highcharts.chart('feelings-wheel', {
      chart: {
        height: '100%',
        backgroundColor: 'transparent',
        spacing: [10, 10, 10, 10]
      },
      title: { text: '' },
      breadcrumbs: { enabled: false },
      series: [{
        type: 'sunburst',
        data: wheelData,
        allowDrillToNode: false,
        cursor: 'pointer',
        point: {
          events: {
            mouseOver: function () { updatePanel(this); },
            click: function () { updatePanel(this); }
          }
        },
        dataLabels: {
          rotationMode: 'auto',
          filter: { property: 'innerArcLength', operator: '>', value: 16 },
          style: {
            fontSize: '12px',
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
                fontSize: '14px',
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
                fontSize: '12px',
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
                fontSize: '12px',
                textOutline: 'none',
                color: '#202522'
              }
            }
          },
          {
            level: 4,
            dataLabels: {
              style: {
                fontSize: '12px',
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

    return wheelChart;
  };
})();