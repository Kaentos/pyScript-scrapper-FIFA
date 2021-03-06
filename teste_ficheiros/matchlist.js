require(['jquery'], function ($) {
  var matchList = {
    $_matches: {},
    $_bracket: {},
    lang: '',
    matchesUpdates: {},
    liveblogUpdate: {},
    init: function () {

      var _this = matchList;

      if (!_cfg) {
        return;
      }

      _this.lang = $("html").attr("lang");

      if (!_this.lang) {
        console.warn("Language not available");
      }

      var $_knockoutTabs = $(".fi-knockout-tabs");
      if ($_knockoutTabs.length) {
        $_knockoutTabs.find("#listview").click(function (e) {
          e.preventDefault();
          $("#fi-list-view").removeClass("hidden");
          $("#fi-bracket-view").addClass("hidden");
          $(".knockout-filters").removeClass("hidden");
          $(this).addClass("active");
          $_knockoutTabs.find("#bracketview").removeClass("active");
        });

        $_knockoutTabs.find("#bracketview").click(function (e) {
          e.preventDefault();
          $("#fi-list-view").addClass("hidden");
          $("#fi-bracket-view").removeClass("hidden");
          $(".knockout-filters").addClass("hidden");
          $(this).addClass("active");
          $_knockoutTabs.find("#listview").removeClass("active");
        });
      }

      setTimeout(_this.scrollToTodayMatches, 1000);

      _this.updateMatchTimes();

      if (_cfg.matchListUpdate != null) {
        _this.getUpdates();
        setInterval(_this.getUpdates, _cfg.matchListUpdate.polling);
      } else {
        console.warn("POLLING: events settings missing!");
      }

      if (_cfg.liveBloggingCompetition && _cfg.liveBlogging) {
        _this.getLiveBlogUpdates();
        setInterval(_this.getLiveBlogUpdates, _cfg.liveBloggingCompetition.polling);
      } else {
        console.warn("POLLING: pageSwitch settings missing!");
      }

      if (_cfg.editorialElements != null) {
        _this.updateHLIcons();
        setInterval(_this.updateHLIcons, _cfg.editorialElements.polling);
      } else {
        console.warn("POLLING: events settings missing!");
      }

      if (_cfg.broadcasters != null) {
        _this.updateBroadcasters();
      }

    },

    updateMatchTimes: function () {

      var _this = matchList;
      if (window.TimeConverter) {
        window.TimeConverter.onMyTime();
      }
    },

    scrollToTodayMatches: function (today) {

      var _this = matchList;
      var _pageOffset = 130;
      var _today = new Date();
      var _topOffset = 0;

      if (today) {
        if ($(".fi-mu-list[data-matchesdate='" + today + "']").length) {
          _topOffset = $(".fi-mu-list[data-matchesdate='" + today + "']").offset().top;

        }
      } else {
        if ($(".fi-mu-list.today").length) {
          _topOffset = $(".fi-mu-list.today").offset().top;
        }
      }

      if (_topOffset) {
        Utility.log("_topOffset: ", _topOffset);
        Utility.log("(_topOffset - _pageOffset): ", (_topOffset - _pageOffset));
        window.scrollTo(0, (_topOffset - _pageOffset));
        Utility.log("scrolled");
      }

    },

    getUpdates: function () {
      var _this = matchList;
      $.get(_cfg.matchListUpdate.url, function (data) {
        if (data) {
          _this.matchesUpdates = data;
          _this.updateMatches();
        }
      });
    },

    getLiveBlogUpdates: function () {
      var _this = matchList;

      var _lbApiKey = "LiveBlogging " + _cfg.liveBlogging.apiKey;

      $.ajax({
        url: _cfg.liveBloggingCompetition.url,
        type: "GET",
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Authorization", _lbApiKey);
        },
        success: function (data) {
          if (data) {
            _this.liveblogUpdate = data;
            _this.updateBlogIcon();
          }
        }
      });

    },

    updateMatches: function () {
      var _this = matchList;

      _this.$_matches = $(".fi-mu");
      _this.$_bracket = $(".fi-bracket");

      _this.$_cuncurrentMatch = $(".fi-mu-concurrent-match");
      var isCuncurrentMatchOn = (_this.$_cuncurrentMatch.length > 0);

      if (isCuncurrentMatchOn) {
        var cuncurrentMatchID = _this.$_cuncurrentMatch.find(".fi-mu").attr("data-id"),
        cuncurrentMatchFound = false;
      }

      var _liveMatches = [];

      for (var i = 0; i < _this.matchesUpdates.Results.length; i++) {
        var _matchData = _this.matchesUpdates.Results[i];
        var $_matchUnit = _this.$_matches.filter("[data-id = '" + _matchData.IdMatch + "']");
        var $_bracketMatchUnit = _this.$_bracket.find(".fi-mu[data-id = '" + _matchData.IdMatch + "']");

        if (window.concurrentMatchBuilder && !window.concurrentMatchBuilder.loaded) {
          window.concurrentMatchBuilder.build({ element: _this.$_cuncurrentMatch });
        }

        if (isCuncurrentMatchOn) {
          if (cuncurrentMatchID == _matchData.IdMatch) {
            cuncurrentMatchFound = true;
          }
        }

        _liveMatches.push(_matchData.IdMatch);

        $_matchUnit.each(function () {
          var _mu = $(this);
          _this.updateMatchUnit(_mu, _matchData);
        });

        _this.updateMatchUnit($_bracketMatchUnit, _matchData);
      }

      _this.$_matches.each(function () {
        var _mid = $(this).attr("data-id");
        if (_liveMatches.indexOf(_mid.toString()) === -1) {
          if ($(this).hasClass("live")) {
            $(this).removeClass("live");
            $(this).removeClass("result");
          }
        }
      });

      if (!cuncurrentMatchFound) {
        _this.$_cuncurrentMatch.hide();
      } else {
        _this.$_cuncurrentMatch.show();
      }

    },

    updateMatchUnit: function ($_matchUnit, _matchData) {

      var _this = matchList;

      var _isLive = (_matchData.MatchStatus === 3);

      var _period = _this.getMatchPeriod(_matchData);

      $_matchUnit.removeClass("live");
      $_matchUnit.removeClass("fixture");
      $_matchUnit.removeClass("result");

      if (_isLive) {
        $_matchUnit.addClass("live");
        $_matchUnit.find("fi-mu__score-wrap").removeClass("hidden")
      } else if (_matchData.Period === 10 || _matchData.MatchStatus == 0) {
        $_matchUnit.addClass("result");
      } else {
        $_matchUnit.addClass("fixture");
      }

      _this.updateScore($_matchUnit, _matchData);
      _this.updateMinute($_matchUnit, _matchData);
      _this.updateReasonWin($_matchUnit, _matchData);
    },

    updateBlogIcon: function () {
      var _this = matchList;
      var blogData = {};

      if (!_this.$_matches) { return; }
      if (!_this.$_matches.length) { return; }

      for (var i = 0; i < _this.liveblogUpdate.items.length; i++) {
        blogData = _this.liveblogUpdate.items[i];
        var matchId = "";
        for (var j = 0; j < blogData.tags.length; j++) {
          var tag = blogData.tags[j];
          if (tag.name.toLowerCase() === "idmatch") {
            matchId = tag.value;
          }
        }

        var $_matchUnit = _this.$_matches.filter("[data-id = '" + matchId + "']");

        if (blogData.status.toLowerCase() === 'live') {
          $_matchUnit.find(".fi-mu__calls__call--lb").removeClass("hidden");
        } else {
          $_matchUnit.find(".fi-mu__calls__call--lb").addClass("hidden");
        }
      }
    },

    getMatchPeriod: function (matchData) {
      var _this = matchList;
      var _period = "";

      if (matchData.MatchStatus === 4) {
        _period = "abandoned";
      }
      else if (matchData.MatchStatus === 7) {
        _period = "postponed";
      }
      else if (matchData.MatchStatus === 8) {
        _period = "cancelled";
      }
      else if (matchData.MatchStatus === 12) {
        _period = "lineups";
      }
      else if (matchData.Period === 4) {
        _period = "half_time";
      }
      else if (matchData.Period === 6) {
        _period = "extra_time";
      }
      else if (matchData.Period === 8) {
        _period = "extra_half_time";
      }
      else if (matchData.Period === 11) {
        _period = "penalty_shootout";
      }
      else if (matchData.Period === 10 || matchData.MatchStatus == 0) {
        _period = "full_time";
      }

      return _period;
    },

    updateScore: function (matchUnit, matchData) {
      var _this = matchList;

      var _isLive = (matchData.MatchStatus === 3);
      var _period = _this.getMatchPeriod(matchData);

      if (_isLive || _period == "post_match" || _period == "abandoned") {
        var _homeScore = matchData.HomeTeam.Score;
        var _awayScore = matchData.AwayTeam.Score;

        var _scoreText = [_homeScore, '-', _awayScore].join('');
        if (_this.lang === 'ar-SA') {
          _scoreText = [_awayScore, '-', _homeScore].join('');
        }

        $(matchUnit).find(".fi-s__scoreText").html(_scoreText);
        $(matchUnit).find(".fi-mu__score.home").html(_homeScore);
        $(matchUnit).find(".fi-mu__score.away").html(_awayScore);
      }

    },

    updateMinute: function (matchUnit, matchData) {
      var _this = matchList;

      var _isLive = (matchData.MatchStatus === 3);
      var _period = _this.getMatchPeriod(matchData);

      var _minute = matchData.MatchTime;

      if (_period && _period !== "live") {
        var $_periodElement = $(matchUnit).find(".fi-s__status").find("." + _period);
        var $_periodElementAbbr = $(matchUnit).find(".fi-s__status--abbr").find("." + _period);
        var $_minuteElement = $(matchUnit).find(".fi-s__status").find(".minute");
        var $_minuteElementAbbr = $(matchUnit).find(".fi-s__status--abbr").find(".minute");
        $(matchUnit).find(".fi-s__status").find(".period").addClass("hidden");
        $(matchUnit).find(".fi-s__status--abbr").find(".period").addClass("hidden");
        $_periodElement.removeClass("hidden");
        $_minuteElement.addClass("hidden");
        $_periodElementAbbr.removeClass("hidden");
        $_minuteElementAbbr.addClass("hidden");
      } else if (_isLive) {
        var $_periodElement = $(matchUnit).find(".fi-s__status").find(".minute");
        var $_periodElementAbbr = $(matchUnit).find(".fi-s__status--abbr").find(".minute");
        $(matchUnit).find(".fi-s__status").find(".period").addClass("hidden");
        $(matchUnit).find(".fi-s__status--abbr").find(".period").addClass("hidden");
        $_periodElement.html(_minute);
        $_periodElement.removeClass("hidden");
        $_periodElementAbbr.html(_minute);
        $_periodElementAbbr.removeClass("hidden");
      } else {
        $(matchUnit).find(".fi-s__status").find(".period").addClass("hidden");
        $(matchUnit).find(".fi-s__status--abbr").find(".period").addClass("hidden");
        var $_periodElement = $(matchUnit).find(".fi-s__status").find(".minute");
        var $_periodElementAbbr = $(matchUnit).find(".fi-s__status--abbr").find(".minute");
        $_periodElement.html(_minute);
        $_periodElementAbbr.html(_minute);
      }
    },

    updateReasonWin: function (matchUnit, matchData) {
      var _this = matchList;

      var _isLive = (matchData.MatchStatus === 3);
      var _period = _this.getMatchPeriod(matchData);

      if (_period && _period === "full_time") {

        var _reasonWinClass = "";

        switch (matchData.ResultType) {
          case 1:
            _reasonWinClass = "normalresult";
            break;
          case 2:
            _reasonWinClass = "penaltyshootout";
            break;
          case 3:
            _reasonWinClass = "extratime";
            break;
          case 4:
            _reasonWinClass = "aggregated";
            break;
          case 5:
            _reasonWinClass = "aggregatedextratime";
            break;
          case 6:
            _reasonWinClass = "awaygoal";
            break;
          case 7:
            _reasonWinClass = "awaygoalextratime";
            break;
          case 8:
            _reasonWinClass = "goldengoal";
            break;
          case 9:
            _reasonWinClass = "silvergoal";
            break;
          case 10:
            _reasonWinClass = "tossofcoin";
            break;
          case 11:
            _reasonWinClass = "forfeit";
            break;
          case 12:
            _reasonWinClass = "awarded";
            break;
        }

        if (_reasonWinClass) {
          var $reasonWinBlock = $(matchUnit).find(".reasonwin ." + _reasonWinClass);
          if ($reasonWinBlock.length) {
            var _markup = $reasonWinBlock.find(".fi-mu__reasonwin .fi-mu__reasonwin-text").html();
            var _markupAbbr = $reasonWinBlock.find(".fi-mu__reasonwin--abbr. fi-mu__reasonwin-text").html();

            var _winnerName = (matchData.Winner === matchData.HomeTeam.IdTeam) ? matchData.HomeTeam.TeamName[0].Description : matchData.AwayTeam.TeamName[0].Description;

            _markup = _markup.replace(/{WinTeamName}/g, _winnerName);
            _markup = _markup.replace(/{ScorePenH}/g, matchData.HomeTeamPenaltyScore);
            _markup = _markup.replace(/{ScorePenA}/g, matchData.AwayTeamPenaltyScore);
            _markup = _markup.replace(/{ScoreAggH}/g, matchData.HomeTeamScore);
            _markup = _markup.replace(/{ScoreAggA}/g, matchData.AwayTeamScore);

            _markupAbbr = _markupAbbr.replace(/{WinTeamName}/g, _winnerName);
            _markupAbbr = _markupAbbr.replace(/{ScorePenH}/g, matchData.HomeTeamPenaltyScore);
            _markupAbbr = _markupAbbr.replace(/{ScorePenA}/g, matchData.AwayTeamPenaltyScore);
            _markupAbbr = _markupAbbr.replace(/{ScoreAggH}/g, matchData.HomeTeamScore);
            _markupAbbr = _markupAbbr.replace(/{ScoreAggA}/g, matchData.AwayTeamScore);

            $reasonWinBlock.find(".fi-mu__reasonwin .fi-mu__reasonwin-text").html(_markup);
            $reasonWinBlock.find(".fi-mu__reasonwin--abbr. fi-mu__reasonwin-text").html(_markupAbbr);

            $(matchUnit).find(".reasonwin ." + _reasonWinClass).removeClass("hidden");
          }
        }

      }
    },

    updateScorers: function () {

      var _this = matchList;

      if (!_this.$_homeScorers) {
        _this.$_homeScorers = _this.$_matchHeader.find(".fi-mh__scorers__home");
      }

      if (!_this.$_awayScorers) {
        _this.$_awayScorers = _this.$_matchHeader.find(".fi-mh__scorers__away");
      }


      if (!_this.scorerTemplate) {
        if ($(".fi-mh__scorertemplate").length > 0) {
          _this.scorerTemplate = $(".fi-mh__scorertemplate").html();
          _this.scorerDetailTemplate = $(_this.scorerTemplate).find('.fi-mh__detail_container').html();
          //$(".fi-mh__scorertemplate").remove();
        } else {
          console.warn("scorer template missing!");
          return;
        }
      }

      var _homeTeamScorers = _this.matchesUpdates.updates.homeScorers;
      var _awayTeamScorers = _this.matchesUpdates.updates.awayScorers;

      var _homeScorersMarkup = '';
      var _awayScorersMarkup = '';

      for (var i = 0; i < _homeTeamScorers.length; i++) {
        var _scorer = _homeTeamScorers[i];
        var _scorerMarkup = _this.getScorerMarkup(_scorer);
        _homeScorersMarkup += _scorerMarkup;
      }

      for (var i = 0; i < _awayTeamScorers.length; i++) {
        var _scorer = _awayTeamScorers[i];
        var _scorerMarkup = _this.getScorerMarkup(_scorer);
        _awayScorersMarkup += _scorerMarkup;
      }

      _this.$_homeScorers.find("ul").html(_homeScorersMarkup);
      _this.$_awayScorers.find("ul").html(_awayScorersMarkup);

    },

    updateHLIcons: function () {
      var _this = matchList;
      $.get(_cfg.editorialElements.url, function (data) {
        if (data) {
          var _edt = JSON.parse(data);
          window.editorialElements = _edt;
          if (window.liveMatchUpdate) {
            window.liveMatchUpdate.updateEditorialElements();
          }
          for (var i = 0; i < _edt.matches.length; i++) {
            var _edtMatchElements = _edt.matches[i];
            if (_edtMatchElements.hasHighlights) {
              if (_this.$_matches.length) {
                var $_matchUnit = _this.$_matches.filter("[data-id = '" + _edtMatchElements.idMatch + "']");
                $_matchUnit.find(".fi-mu__calls__call--hl").removeClass("hidden");
              }
            }
          }

        }
      });
    },

    updateBroadcasters: function (country) {
      var _this = matchList;

      var $_broadcasters = $(".dropdown--broadcasters");

      $(".fi-mu__broadcasters").addClass("hidden");

      if (!country) {
        var _geolocatedCountry = "";
        if ($(".fi_broadcasters__geolocation").length) {
          _geolocatedCountry = $(".fi_broadcasters__geolocation").html().trim();
        }

        if (_geolocatedCountry) {
          country = _geolocatedCountry;
        } else {
          country = $_broadcasters.find("li:first").data("value");
          country = (!Utility.isMobile()) ? $_broadcasters.find("li:first").data("value") : $_broadcasters.find("option:first").val();
        }
      }

      if (!country) { return; }

      if (!Utility.isMobile()) {
        var $active = $_broadcasters.find("li[data-value='" + country + "']");
        if (!$active.length) {
          $active = $_broadcasters.find("li:first");
        }
        $active.addClass("active");
        var selectedValue = $active.find("a").html();
        $_broadcasters.find(".fi-selected-item").html(selectedValue);
      } else {
        $_broadcasters.find("select").val(country);
      }


      var _url = _cfg.broadcasters.url.replace("[geo]", country);

      $.get(_url, function (data) {
        if (data) {
          data = data.replace(/&quot;/g, '\\"');
          data = data.replace(/\\/g, '');
          var _bc = JSON.parse(data);
          if (_bc) {

            for (var i = 0; i < _bc.matches.length; i++) {
              var _match = _bc.matches[i];
              var $_container = $(".fi-mu__broadcasters[data-id='" + _match.id + "']");

              var _isMatchPlayed = $(".fi-mu[data-id-ifes='" + _match.id + "']").hasClass("result");

              if (_isMatchPlayed) {
                continue;
              }

              var _markup = "";

              for (var j = 0; j < _match.sources.length; j++) {
                var _source = _match.sources[j];
                var _sourceUrl = (_source.url.indexOf("http") === -1) ? "https://" + _source.url : _source.url;
                _markup += "<a href=\"" + _sourceUrl + "\" class=\"fi-mu__broadcasters__logo\" target=\"_blank\" title=\"" + _source.name + "\" style=\"background-image:url('" + _source.logo + "')\"></a>";
                //_markup += "<img src=\"" + _source.logo + "\" class=\"fi-mu__broadcasters__logo\" alt=\"" + _source.name + "\" title=\"" + _source.name + "\"/>";
              }

              $_container.html(_markup);
              $_container.removeClass("hidden");
            }

          }

        }
      });
    }

  };

  $(document).ready(function () {
    matchList.init();
    window.matchList = matchList;


    $('.dropdown--broadcasters li').click(function (e) {
      var _value = $(this).data("value");
      matchList.updateBroadcasters(_value);
    });

    $('.dropdown--broadcasters select').change(function (e) {
      var _value = $(this).val();
      matchList.updateBroadcasters(_value);
    });



    $(".tabs-nav").on("tabs:change", function (e, tabId) {
      Utility.scrollTop();
    });



  });
});