/*
#"<--- Copyright 2013 de Retórica/Davi Moreira, Luis Carli e Manoel Galdino 
# Este arquivo é parte do programa Retorica. 
# O Retorica é um software livre; você pode redistribuí-lo e/ou modificá-lo dentro 
# dos termos da [GNU General Public License OU GNU Affero General Public License] 
# como publicada pela Fundação do Software Livre (FSF); na versão 3 da Licença.
# Este programa é distribuído na esperança que possa ser útil, mas SEM NENHUMA GARANTIA; 
# sem uma garantia implícita de ADEQUAÇÃO a qualquer MERCADO ou APLICAÇÃO EM PARTICULAR. 
# Veja a licença para maiores detalhes. Você deve ter recebido uma cópia da 
# [GNU General Public License OU GNU Affero General Public License], sob o título "LICENCA.txt"
*/
//= require typeahead.bundle
//= require lodash
//= require d3
if (!d3.custom) {
  d3.custom = {};
}

d3.custom.forceLayout = function(authors) {
  var color_h = "#e9a30d";
  var color_m = "#6d9c66";
  var color_s = "#409f89";

  $('.dropdown-menu').css('min-width', String($('.ano').width()) + 'px');

  $('.dropdown-menu a').click(function() {
    $('.ano .label').text($(this).text());
  });

  if ($('.dropdown-menu a').text() == "") {
    $('.dropdown-menu').remove();
  }

  d3.select('.inputContainer')
    .style({
      display: 'block'
    });

  var clipData = [];
  var inputData = [];

  _.each(authors, function(d, i) {
    _.each(d.children, function(d, i) {
      if (d.id != 'NA') {
        clipData.push(d);
        inputData.push(d.author);
      }
    });
  });

  var w = $(window).width() - $('.col-md-3').width(),
    h = $(document).height(),
    topicCircleOpacity = 1,
    topicCircleSelOpacity = 1;
    
    $('.content-description').css('min-height', h);
/*    $(window).resize(function() {
        $('.full-height').height($(document).height());
    });*/   

  var docs = _.map(authors, function(d, i) {
    return {
      id: d.id,
      topic: d.topic,
      value: d.value
    };
  });
  
  /** LINKS **/
  
  var temas = _.sortBy(docs, function(d) {
    return d.topic;
  });

  temas = _.groupBy(temas, function(d, i) { return Math.floor(i / 2); });

  _.each(temas, function(d, i) {
    var row = $('<tr>');

    row.appendTo($('.temas.row table tbody'));

    _.each(d, function(d, i) {
      row.append('<td><a id="' + d.id + '" href="#">' + d.topic + '</a></td>');
    });
  });

  var rScale = d3.scale.linear()
    .domain(d3.extent(docs, function(d, i) {
      return d.value;
    }))
    //.domain([0, d3.max(docs, function(d, i) {return d.value; })])
    .range([20, 120]);

  var rOpenScale = d3.scale.sqrt()
    .domain(d3.extent(authors, function(d, i) {
      return d.children.length;
    }))
    .range([100, 300]);

  var cScale = d3.scale.linear()
    .domain(rScale.domain())
    .range(["hsl(163, 47%, 57%)", "hsl(163, 99%, 20%)"])
    .interpolate(d3.interpolateHcl);

  _.each(docs, function(d, i) {
    d.r = rScale(d.value);
    d._r = d.r;
  });

  var pack = d3.layout.pack();

  var force = d3.layout.force()
    .size([w, h])
    .gravity(0.04)
    .nodes(docs);

  // DRAGSTART DOES NOTHING?
  var drag = force.drag().on("dragstart", function() { });

  force.start();

  /***************
   * DRAW IT
   ***************/

  var svg = d3.select('svg#main')
    //.append('svg')
    .attr({width: w})
    .style({
      fill: 'transparent',
      'min-height': '1080px'
    });

  // Defs
  svg.append('defs')
    .selectAll('clipPath')
    .data(clipData)
    .enter()
    .append('clipPath')
    .attr('id', function(d, i) {
      return 'c' + d.id;
    })
    .append('circle')
    .attr({
      'class': function(d, i) {
        return 'clipPathCircle c' + d.id;
      },
      x: 0,
      y: 0,
      r: 30
    });

  // Background
  svg.append('rect')
    .attr({
      x: 0,
      y: 0,
      width: w
    })
    .style({
      height: '100%'
    })
    .on('click', closeTopics);

  svg = svg.append('g')
    .attr({
      transform: 'translate(-50, 50)'
    });

  // Topics
  var cGroups = svg
    .selectAll('.cGroups').data(docs)
    .enter()
    .append('g')
    .attr({
      'class': 'cGroups',
      'data-id': function(d, i) {
        return d.id;
      }
    })
    .style({
      cursor: 'pointer'
    });

  cGroups.append('circle')
    .attr({
      'class': 'topicCircle',
      r: function(d, i) {
        return d.r - 2;
      }
    })
    .style({
      fill: function(d, i) {
        /*return cScale(d.value)*/
        return colorize(d);
      },
      /*            stroke: function(d,i){
                      return d3.hsl(cScale(d.value)).darker(0)
                      return "3px solid #fff";
                  }*/
    });


  cGroups.append('g')
    .attr({
      'class': 'depG',
      transform: function(d, i) {
        return 'translate(' + (-d.r + 4) + ',' + (-d.r + 4) + ')';
      }
    })
    .each(drawDep);

  var fo = cGroups.append('foreignObject')
    .attr({
      x: function(d, i) {
        return -d.r + 5;
      },
      y: 0,
      width: function(d, i) {
        return d.r * 2 - 10;
      },
      height: function(d, i) {
        return d.r * 2 - 10;
      }
    });

  var topicLabel = fo.append('xhtml:div')
    .attr('class', 'topicLabel')
    .attr({
      'pointer-events': 'none'
    });
  // .style({
  //     display: function(d,i){
  //         return d.r < 30 ? 'none' : 'block'
  //     }
  // })

  /*topicLabel.insertBefore('<switch>')*/

  /*topicLabel.append('rect')
      .attr({
          x: function(d,i){return -d.r+5},
          y: -10,
          width: function(d,i){return d.r*2-10},
          height: 20
      })
      .style({
          /*fill: function(d,i){return cScale(d.value)},*/
  /*opacity: .6
        })*/

  var text = topicLabel.append('xhtml:div')
    .text(function(d, i) {
      return d.topic;
    })
    .attr({
      width: 'auto',
      height: 'auto'
    })
    .attr({
      /*x:-30, y:0, dy: '.35em',*/
      'text-anchor': 'middle'
    })
    .style({
      fill: '#30524d',
      'text-align': 'center'
    })
    .style('font-size', function(d, i) {
      return String(d.r / 4) + 'px';
    });

  var typeahead = $('.typeahead').typeahead({
    name: 'deputados',
    local: inputData
  });

  $('.anos').on("click", function() {
    ev = $.Event("keydown");
    ev.keyCode = ev.which = 40;
    $(this).trigger(ev);
    return true;
  });

  topicLabel.style({
    display: function(d, i) {
      var rect = d3.select(this).select('div').node().getBoundingClientRect();

      if (d.r * 2 < 100) {
        d.label = false;
        /*return 'none'*/
      } else {
        d.label = true;
        /*return 'block'*/
      }
    }
  });

  fo.each(function(d, i) {
    var rect = d3.select(this).select('div').node().getBoundingClientRect();
    var height = String(-(rect.height / 2));
    this.setAttribute('y', height);
  })

  /*fo.attr('y', '-50')*/

  c_before = "";

  cGroups
    .call(drag)
    .on('mouseover', function(d, i) {
      c_before = d3.select(this).select('.topicCircle').style('fill');

      if (d.fixed) {
        return;
      }

      d3.select(this)
        .select('.topicCircle')
        .style({
          'fill': ((d3.rgb(this.firstChild.getAttribute('style'))).brighter(0.4)).toString()
        });

      if (d.label) {
        return;
      }

      var rect = this.getBoundingClientRect();

      var popover = d3.select('.popover2');

      // update the text
      popover.select('.nome').text(d.topic);

      var rectPop = d3.select('.popover2').node().getBoundingClientRect();

      popover.style({
        opacity: 1,
        left: (rect.left - rectPop.width / 2 + d.r) + 'px',
        top: (d.y + 80) + 'px'
      });

      popover.select('.tick')
        .style({
          left: (rectPop.width / 2 - 7) + 'px'
        });
    })
    .on('mouseout', function(d, i) {
      /*if (d.fixed) return*/
      d3.select(this)
        .select('.topicCircle')
        .style({
          /*'stroke-width': 0*/
          'fill': c_before
        });

      d3.select('.popover2')
        .style({
          opacity: 0
        });
    })
    .on('click', function(d, i) {
      d3.select('.popover2')
        .style({
          opacity: 0
        });

      if (d.fixed) {
        closeTopics(d, i);
        return;
      }

      closeTopics(d, i);

/*      d3.select('.name')
        .text(d.topic);

      d3.select('.intro')
        .transition()
        .style({
          opacity: 0
        })
        .each("end", function() {
          d3.select('.intro')
            .style({
              display: 'none'
            })
        });*/

      var sel = d3.select(this);

      cGroups.filter(function(d, i) {
          return d.fixed == true;
        })
        .selectAll('.topicCircle')
        .transition()
        .duration(900)
        .attrTween('r', rTweenSmall)
        /*.style({
          'fill-opacity': topicCircleOpacity
        })*/

      _.each(docs, function(d, i) {
        d.fixed = false;
      });

      openCircle(sel);
      
    });

  /*d3.select('svg#main')
    .append('path')
    .attr({
      d: 'M40 96 h300'
    })
    .style({
      stroke: '#97debe',
      'stroke-width': 1
    })*/

  function closeTopics(d, i) {
    d3.select('.name').text('');
    d3.select('.part').text('');
    d3.select('.email').text('');
    d3.select('.site').text('');
    
    d3.select('.temas')
      .transition()
      .style({
        opacity: 0
      })
      .each("end", function() {
        d3.select('.temas')
          .style({
            display: 'none'
          });
      });
    
    d3.select('.sobre')
      .transition()
      .style({
        opacity: 0
      })
      .each("end", function() {
        d3.select('.sobre')
          .style({
            display: 'none'
          });
      });
    
    d3.select('.intro')
      .transition()
      .style({
        opacity: 1
      })
      .each("end", function() {
        d3.select('.intro')
          .transition()
          .style({
            opacity: 1
          })
          .style({
            display: 'block'
          });
      });

    d3.select('.info')
      .transition()
      .style({
        opacity: 1
      });

    var sel = cGroups.filter(function(d, i) {
      return d.fixed == true;
    });

    sel.selectAll('.topicCircle')
      .transition()
      .duration(900)
      .attrTween('r', rTweenSmall)
      .style({
        'fill-opacity': topicCircleOpacity
      });

    sel.select('.topicLabel')
      .transition()
      .delay(500)
      .style({
        opacity: 1
      });

    sel.selectAll('.depImage, .depG')
      .transition()
      .style({
        opacity: 0
      })
      .each('end', function(d, i) {
        d3.select(this)
          .style({
            display: 'none'
          });
      });

    force.resume();

    _.each(docs, function(d, i) {
      d.fixed = false;
    });
  }

  function rTweenBig(d, i) {
    var sel = d3.select(this.parentNode).select('.depG');
    var author = _.find(authors, function(d2, i2) {
      return d2.topic == d.topic;
    });

    var r = rOpenScale(author.children.length);
    var i = d3.interpolate(d.r, r);

    return function(t) {
      sel.each(drawDep);
      var v = i(t);
      d.r = v;
      return v;
    }
  }

  function rTweenSmall(d, i) {
    var sel = d3.select(this.parentNode).select('.depG');
    var i = d3.interpolate(d.r, d._r);
    return function(t) {
      sel.each(drawDep);
      var v = i(t);
      d.r = v;
      return v;
    }
  }

  function posTween(d, i) {
    var iX = d3.interpolate(d.x, w / 2);
    var iY = d3.interpolate(d.y, h / 2);

    return function(t) {
      var x = iX(t);
      var y = iY(t);
      d.x = x;
      d.y = y;
      return 'translate(' + d.x + ',' + d.y + ')';
    }
  }

  /////////////////

  force.on('tick', function(e) {
    var q = d3.geom.quadtree(docs),
      i = -1,
      n = docs.length;

    while (++i < n) {
      q.visit(collide(docs[i]));
    }

    cGroups
      .attr({
        transform: function(d, i) {
          return 'translate(' + d.x + ',' + d.y + ')';
        }
      })
      .select('circle')
      .attr({
        // r: function(d,i){return d.r - 2}
      });
  });

  function drawDep(d, i) {
    var sel = d3.select(this);

    var x = (-d.r + 4) + ',' + (-d.r + 4);

    sel.attr({
      transform: function(d, i) {
        return 'translate(' + (-d.r + 4) + ',' + (-d.r + 4) + ')';
      }
    });

    pack.size([d.r * 2 - 8, d.r * 2 - 8]);

    var nodes = pack.nodes(_.find(authors, function(d2, i2) {
      return d2.topic == d.topic;
    }));

    var depCircleG = sel.selectAll('g.depCircleG').data(nodes, function(d, i) {
      return d.id;
    });

    var depCircleG_enter = depCircleG.enter().append('g')
      .attr({
        'class': 'depCircleG',
        'data-nome': function(d2, i) {
            return d2.author;
          }
          /*,
          'data-partido': function(d2,i) { return d2. },
          'data-uf': function(d2,i) { return d2.uf }
          */
      })
      .on('mouseover', function(d2, i) {

        if (!d.fixed) {
          return;
        }

        d3.select(this).select('.depCircle')
          .style({
            'stroke-width': 4,
            'stroke': '#05504c'
          });

        var rect = this.getBoundingClientRect();

        var popover = d3.select('.popover');

        popover.select('.nome').text(d2.author);
        popover.select('.partido').text(d2.partido + ' / ' + d2.uf);

        var rectPop = d3.select('.popover').node().getBoundingClientRect();

        popover.style({
          opacity: 1,
          left: (rect.left - rectPop.width / 2 + d2.r) + 'px',
          top: d2.y + 500 - d.r + 'px'
          /*d2.y + d2.r*2*/
        });

        popover.select('.tick')
          .style({
            left: (rectPop.width / 2 - 7) + 'px'
          });
      })
      .on('mouseleave', function(d2, i) {
        if (!d.fixed) {
          return;
        }

        d3.select(this).select('.depCircle')
          .style({
            'stroke-width': 0
          });

        d3.select('.popover')
          .style({
            opacity: 0
          });
      })
      .on('click', function(d2, i) {
        if (!d.fixed) {
          return;
        }

        d3.event.stopPropagation();
        
        d3.select('.intro')
          .transition()
          .style({
            opacity: 0
          })
          .each("end", function() {
            d3.select('.intro')
              .style({
                display: 'none'
              })
          });
        
        d3.select('.sobre')
          .transition()
          .style({
            opacity: 0
          })
          .each("end", function() {
            d3.select('.sobre')
              .style({
                display: 'none'
              });
          });

        if (d2.author != d3.select('.name').text()) {
          d3.select('.info')
            .transition()
            .style({
              opacity: 0
            })
            .each("end", function() {
              d3.select('.info')
                .style({
                  display: 'block'
                })
                .transition()
                .style({
                  opacity: 1
                })
                .each("end", function() {
                  d3.select('.intro')
                    .style({
                      diplay: 'none'
                    });
                });

              d3.select('.info .name').text(d2.author);

              d3.select('.info .part').text(function() {
                  if (d2.partido === undefined || d2.uf === undefined) {
                    return '';
                  } else {
                    return d2.partido + '/' + d2.uf;
                  }
                });

              d3.select('.info .email')
                .text(function() {
                  if (d2.email == 'NA') {
                    return 'email não disponível';
                  } else {
                    return d2.email;
                  }
                });

                d3.select('.info .site').text(function() {
                  if (d2.url === undefined) {
                    return '';
                  }

                  if (d2.situacao != "Em Exercício") {
                    return 'Deputado nao está exercício';
                  } else {
                    if (d2.sexo == "M") {
                      return 'Site do Deputado';
                    } else {
                      return 'Site da Deputada';
                    }
                  }
                })
                .attr({
                  href: d2.url
                });
            });
        }
      });

    depCircleG_enter.each(function(d, i) {
      var sel = d3.select(this);

      sel.append('circle')
        .attr({
          'class': 'depCircle'
        });

      if (d.foto != 'NA' && d.id != undefined) {
        sel.append('image')
          .attr({
            'class': 'depImage',
            x: 0,
            y: 0,
            'preserveAspectRatio': 'xMinYMin slice',
            'xlink:href': function() {
              return d.foto;
            },
            'clip-path': function() {
              return 'url(#c' + d.id + ')';
            }
          });
      } else {
        sel.append('image')
          .attr({
            'class': 'depImage',
            x: 0,
            y: 0,
            'preserveAspectRatio': 'xMinYMin slice',
            'xlink:href': function() {
              return '/assets/null.jpg';
            },
            'clip-path': function() {
              return 'url(#c' + d.id + ')';
            }
          });

          // sel.append('rect')
          //     .attr({
          //         'class': 'depImage',
          //         x:0, y:0,
          //         'preserveAspectRatio': 'xMinYMin slice',
          //         'clip-path': function(d,i){
          //             return 'url(#c'+ d.id +')'
          //         }
          //     })
          //     .style({
          //         fill: 'white'
          //     })
      }
    });

    depCircleG.attr({
        transform: function(d, i) {
          return 'translate(' + d.x + ',' + d.y + ')';
        }
      })
      .style({
        display: function(d) {
          return d.children ? "none" : "block";
        }
      });

    depCircleG.select('.depCircle')
      .attr({
        // cx: function(d,i){return d.x},
        // cy: function(d,i){return d.y},
        r: function(d, i) {
          // return d.parent.children.length > 1 ? d.r - 2 : d.r - 4
          return d.r - 2;
        }
      });

    depCircleG.select('.depImage')
      .attr({
        x: function(d, i) {
          return -d.r + 2;
        },
        y: function(d, i) {
          return -d.r + 2;
        },
        width: function(d, i) {
          return d.r * 2 - 4;
        },
        height: function(d, i) {
          return d.r * 2 - 4;
        },
        'clip-path': function(d, i) {
          return 'url(#c' + d.id + ')';
        }
      })
      .each(function(d, i) {
        var _s = '.c' + d.id;

        d3.select(_s)
          .attr({
            r: function(d, i) {
              return d.r - 2;
            }
          });
      });

    depCircleG.exit().remove();
  }

  function getClassList(node) {
    var classes = node.getAttribute('class');
    return classes ? classes.split(' ') : [];
  }

  function addClass(node, klass) {
    var cl = getClassList(node).filter(function(c) { return c !== klass });
    node.setAttribute('class', cl.concat([klass]).join(' '));
  }

  function removeClass(node, klass) {
    var cl = getClassList(node).filter(function(i) { return i !== klass });
    node.setAttribute('class', cl.join(' '));
  }
  
  $('.logo, .title').click(function(d, i) {
    closeTopics(d,i);
  })
  
  $('#temas').click(function(e) {
    e.preventDefault();
    d3.select('.intro')
        .transition()
        .style({
          opacity: 0
        })
        .each("end", function() {
          d3.select('.intro')
            .style({
              display: 'none'
            })
          d3.select('.temas')
            .transition()
            .style({
              display: 'block'
            })
            .each("end", function() {
              d3.select('.temas')
                .transition()
                .style({
                  opacity: 1
                })
            });
        });
  });

  $('.temas a').click(function(e, d, i) {
    e.preventDefault();
    sel = d3.select('[data-id="' + String($(this).attr('id')) + '"]');
    closeTopics(d, i);
    openCircle(sel);      
  });

  /**
   * TODO Por enquanto isso vai ficar assim mesmo. Mas o ideal seria que,
   * quando um resultado fosse selecionado, todas as outras bolhas ficassem
   * "opacas", e apenas a bolha selecionada (e a fotinha selecionada) ficassem
   * "destacadas".
   */
  typeahead.on('typeahead:selected typeahead:autocompleted', function(e, data) {
    cGroups.each(function(d, i) {
      d3.select(this).selectAll('.depCircleG').each(function() {
        if (this.getAttribute('data-nome') == data.value) {
          var selected_el = d3.select(this.parentElement.parentElement);
          closeTopics(d, i);
          openCircle(selected_el);
          for (i = 0; i < n; i++) {
            var x = this.parentElement.childNodes.item(i);
            if (this.getAttribute('data-nome') != x.getAttribute('data-nome')) {
              x.setAttribute('class', 'depCircleG opaque');
            }
          }
        }
      });
    });
  });
    
  $('.typeahead').bind("change paste keyup", function(e, data) {

    var value = $(this).val();
    var suggestions = [];


    $('span.tt-suggestions .tt-suggestion').each(function() {
      suggestions.push($(this).text().trim().toLowerCase());
    });

    function shouldHighlight(node) {
      var nome = node.getAttribute('data-nome');
      return nome && suggestions.indexOf(nome.trim().toLowerCase()) >= 0;
    }

    if (!value || value === '') {
      d3.selectAll('.cGroups').each(function() {
        addClass(this, 'visible');
        removeClass(this, 'opaque');

        d3.select(this).selectAll('.depCircleG').each(function() {
          addClass(this, 'visible');
          removeClass(this, 'opaque');
        });
      });
      return;
    }

    d3.selectAll('.cGroups').each(function() {
      var hasHighlightedChild = false;

      d3.select(this).selectAll('.depCircleG').each(function() {
        var name = this.getAttribute('data-nome');
        
        // TODO FIXME descobrir porque alguns caras não tem nome
        if (!name) {
          return;
        }

        if (!shouldHighlight(this)) {
          // If the item should not be highlighted, we add this
          // opaque class to them.
          addClass(this, 'opaque');
          removeClass(this, 'visible');
        } else {
          // Items are automatically highlighted. Just remove the
          // opaque class from them as a good measure.
          addClass(this, 'visible');
          removeClass(this, 'opaque');

          hasHighlightedChild = true;
        }
      });

      if (!hasHighlightedChild) {
        addClass(this, 'opaque');
        removeClass(this, 'visible');
      } else {
        addClass(this, 'visible');
        removeClass(this, 'opaque');
      }
    });

    if (n == 0 && value) {
        $('.search-result').css('display','block');
    } else {
        $('.search-result').css('display','none');
    }
  });
  
  function openCircle(sel) {
      sel.transition()
        .duration(900)
        .attrTween('transform', posTween)
        .each('end', function(d, i) {
          return d.fixed = true;
        });

      sel.selectAll('.topicCircle')
        .transition()
        .duration(900)
        .attrTween('r', rTweenBig);
        /*.style({
           'fill-opacity': topicCircleSelOpacity,
        })*/

      sel.select('.topicLabel')
        .transition()
        .style({
          opacity: 0
        });

      sel.selectAll('.depImage, .depG')
        .style({
          display: 'block'
        })
        .transition(100)
        .delay(function(d, i) {
          return 600 + i * 10;
        })
        .style({
          opacity: 1
        });

    force.resume();
  }

  function colorize(d) {
    n = (parseInt(d.r));
    if (n >= 50) {
      return color_h;
    } else if (n < 50 && n >= 30) {
      return color_m;
    } else {
      return color_s;
    }
  }

  ax = parseInt($('#triangle').css('border-right-width'));
  ay = 0;
  bx = 0;
  by = -parseInt($('#triangle').css('border-top-width'));

  cx = 250;
  cy = -250;

  function distance(ax, ay, bx, by) {
    return Math.sqrt(Math.pow((ax - bx), 2) + Math.pow((ay - by), 2));
  }

  function is_between(ax, ay, bx, by, x, y) {
    return (distance(ax, ay, x, y) + distance(x, y, bx, by) == distance(ax, ay, bx, by));
  }

  var nx = 0;
  ny = 0;
  nn = 0;

  pcx = []; //pontos de colisão x
  pcy = []; //pontos de colisão y

  for (nx = 0; nx <= ax; nx++) {
    for (ny = 0; ny >= by; ny--) {
      if (is_between(ax, ay, bx, by, nx, ny)) {
        pcx.push(nx);
        pcy.push(ny);
      }
    }
  }

  jQuery.fn.d3Click = function() {
    this.each(function(i, e) {
      var evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      e.dispatchEvent(evt);
    });
  };

  function tog(v) {
    return v ? 'addClass' : 'removeClass';
  }

  $(document).on('input', '.typeahead', function() {
    $(this)[tog(this.value)]('x');
  }).on('mousemove', '.x', function(e) {
    $(this)[tog(this.offsetWidth - 25 < e.clientX - this.getBoundingClientRect().left)]('onX');
  }).on('click', '.onX', function() {
    $(this).removeClass('x onX').val('').change();
    $('.typeahead').typeahead('setQuery', '');
  });

  function collide(node) {
    var r = node.r + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;

    return function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== node)) {
        var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.r + quad.point.r;

        if (l < r) {
          l = (l - r) / l * .5;
          node.x -= x *= l;
          node.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
  }
}
