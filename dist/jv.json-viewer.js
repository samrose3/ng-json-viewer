/*! jv.json-viewer v0.1.0 | Sam Rose <samrose3@gmail.com> | (c) 2015 */
angular.module('jv.json-viewer', []);

(function() {
    'use strict';

    angular
      .module('jv.json-viewer')
      .service('jsonViewerService', jsonViewerService);

    function jsonViewerService() {

      var service = {
        jsonString: '',
        handlersCreated: false,
        parseJson: parseJson
      };

      return service;

      function parseJson() {

        // Variables
        var $result = document.getElementById('result'),
          event_click = 'click';

        var typeOf = function(variable) {
          return typeof JSON.parse(variable);
        };

        // Create Event Handlers
        function createEventHandlers() {
          // Menu Click Events
          var i = 0,
            nodes = document.querySelectorAll('.ui-option'),
            node;

          function makeMenuHandler() {
            document.querySelector('#main').classList.toggle(this.id);
          }

          for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            node.addEventListener(event_click, makeMenuHandler, false);
          }

          // Create Bracket Toggling Click Events
          $result.addEventListener(event_click, function(ev) {
            if (ev.target.classList.contains('toggle') || ev.target.classList.contains('toggle-end')) {
              ev.target.parentNode.classList.toggle('collapsed');
            }
          }, false);
        }


        // Parse the JSON String
        function parse(str) {

          function trim(s) {
            return ltrim(rtrim(s));
          }

          function rtrim(s) {
            return s.replace(/\s+$/g, '');
          }

          function ltrim(s) {
            return s.replace(/^\s+/g, '');
          }

          function findEndString() {
            var current = 0,
              nbBackslash, i;
            do {
              current = snatch.indexOf('"', current + 1);
              nbBackslash = 0;
              i = 1;
              do {
                if (snatch.substring(current - i, current - i + 1) === '\\') {
                  nbBackslash = nbBackslash + 1;
                  i++;
                  continue;
                }
                break;
              } while (true);
              if (nbBackslash % 2 === 0) {
                break;
              }
            } while (true);
            return current;
          }

          function parseObject(snatch) {
            function parsePair(snatch) {
              function parseString(snatch) {
                var name, length, k, firstChar = snatch.substring(0, 1);
                snatch.update('');
                if (firstChar === '"') {
                  name = snatch.shift(findEndString(snatch.todo) + 1);
                  if (name.search(/\\u(?![\d|A-F|a-f]{4})/g) !== -1) {
                    return snatch.err('\\u must be followed by 4 hexadecimal characters', name);
                  }
                  length = name.length;
                  for (k = 0; k < length; k++) {
                    if (name.substring(k, k + 1) === "\\") {
                      if (k + 1 < length) {
                        k++;
                        if (!name.substring(k, k + 1).search(/[^\"|\\|\/|b|f|n|r|t|u]/)) {
                          return snatch.err('Backslash must be escaped', name);
                        }
                      }
                    }
                  }
                  return snatch.update('<span class="property">"<span class="p">' + name.substring(1, name.length - 1) + '</span>"</span>');
                }
                name = snatch.shift(snatch.indexOf(':'));
                return snatch.err('Name property must be a String wrapped in double quotes.', name);
              }

              function parseSeparator(snatch) {
                if (snatch.substring(0, 1) !== ':') {
                  snatch.err('Semi-column is missing.', snatch.shift(snatch.indexOf(':')));
                }
                return snatch.swap(1);
              }
              snatch.update('<li>');
              if (snatch.substring(0, 1) === '}') {
                return snatch.update('</li>');
              }
              snatch = parseString(snatch);
              snatch = parseSeparator(snatch);
              snatch = parseValue(snatch, '}');
              if (snatch.substring(0, 1) === ',') {
                snatch.swap(1).update('</li>');
                return parsePair(snatch);
              }
              if (snatch.substring(0, 1) === '}') {
                return snatch.update('</li>');
              }
              return snatch.err('Comma is missing', snatch.shift(snatch.indexOf('}'))).update('</li>');
            }
            if (snatch.indexOf('{') === -1) {
              snatch.err('Opening brace is missing', snatch.todo);
              return snatch.update('', '');
            } else {
              snatch.shift(1);
              snatch.update('<span class="object"><span class="toggle">{</span><ul>');
              snatch = parsePair(snatch).update('</ul>');
              if (snatch.indexOf('}') === -1) {
                snatch.err('Closing brace is missing', snatch.todo);
                return snatch.update('', '');
              }
              return snatch.span('toggle-end', snatch.shift(1));
            }
          }

          function parseArray(snatch) {
            var io = 0;

            function parseElement(snatch) {
              snatch.update('<li>');
              snatch = parseValue(snatch, ']');
              if (snatch.substring(0, 1) === ',') {
                snatch.swap(1).update('</li>');
                return parseElement(snatch, ++io);
              }
              if (snatch.substring(0, 1) === ']') {
                return snatch.update('</li>');
              }
              return snatch.err('Comma is missing', snatch.shift(snatch.search(/(,|\])/))).update('</li>');
            }
            if (snatch.indexOf('[') === -1) {
              snatch.err('Opening square bracket is missing', snatch.todo);
              return snatch.update('', '');
            }
            snatch.shift(1);
            snatch.update('<span class="array">');
            snatch.update('<span class="toggle">[</span><ol>');
            if (snatch.indexOf(']') === 0) {
              snatch.shift(1);
              snatch.update('</ol><span class="toggle-end" card="0">]</span>');
              return snatch.update('</span>');
            }
            snatch = parseElement(snatch, 0);
            if (snatch.indexOf(']') === -1) {
              snatch.err('Closing square bracket is missing', snatch.todo);
              snatch.update('</ol><span class="toggle-end" card="' + (io + 1) + '"></span>');
              return snatch.update('</span>');
            }
            snatch.shift(1);
            snatch.update('</ol><span class="toggle-end" card="' + (io + 1) + '">]</span>');
            return snatch.update('</span>');
          }

          function parseValue(snatch, closingBracket) {
            var value, j, k, length, propertyValue, type = '';
            if (snatch.search(/^(")/) === 0) {
              value = snatch.shift(findEndString(snatch.todo) + 1);
              if (value.search(/\\u(?![\d|A-F|a-f]{4})/g) !== -1) {
                return snatch.err('\\u must be followed by 4 hexadecimal characters', value);
              }
              length = value.length;
              for (k = 0; k < length; k++) {
                if (value.substring(k, k + 1) === "\\") {
                  if (k + 1 < length) {
                    k++;
                    if (!value.substring(k, k + 1).search(/[^\"|\\|\/|b|f|n|r|t|u]/)) {
                      return snatch.err('Backslash must be escaped', value);
                    }
                  }
                }
              }
              return snatch.span('string', value);
            }
            if (snatch.search(/^\{/) === 0) {
              return parseObject(snatch);
            }
            if (snatch.search(/^\[/) === 0) {
              return parseArray(snatch);
            }
            j = snatch.search(new RegExp('(,|' + closingBracket + ')'));
            if (j === -1) {
              j = snatch.todo.length - 1;
              propertyValue = rtrim(snatch.todo);
              snatch.update('', '');
            } else {
              propertyValue = rtrim(snatch.shift(j));
            }
            try {
              type = typeOf(propertyValue);
            } catch (e) {}
            switch (type) {
              case 'boolean':
              case 'number':
                return snatch.span(type, propertyValue);
              default:
                if (propertyValue === 'null') {
                  return snatch.span('null', propertyValue);
                } else {
                  if (propertyValue.search(/^(')/) === 0) {
                    return snatch.err('String must be wrapped in double quotes', propertyValue);
                  }
                  return snatch.err('Unknown type', propertyValue);
                }
            }
          }

          var hasError = false,
            Snatch = function(todo) {
              this.done = '';
              this.todo = todo ? todo : '';
              this.update = function(done, todo) {
                if (done) {
                  this.done += done;
                }
                if (todo !== undefined) {
                  this.todo = ltrim(todo);
                }
                return this;
              };
              this.swap = function(charNumber) {
                if (charNumber && !isNaN(Number(charNumber)) && this.todo.length >= charNumber) {
                  this.update(this.todo.substr(0, charNumber), this.todo.substring(charNumber));
                }
                return this;
              };
              this.toString = function() {
                if (this.todo.length !== 0) {
                  this.err('Text after last closing brace.', this.todo);
                }
                return this.done;
              };
              this.span = function(className, text) {
                return this.update('<span class="' + className + '">' + text + '</span>');
              };
              this.err = function(title, text) {
                hasError = true;
                return this.update('<span class="error" title="' + title + '">' + text + '</span>');
              };
              this.shift = function(nbOfChars) {
                var shifted;
                if (nbOfChars && !isNaN(Number(nbOfChars)) && this.todo.length >= nbOfChars) {
                  shifted = this.substring(0, nbOfChars);
                  this.update('', this.substring(nbOfChars));
                  return rtrim(shifted);
                }
                return '';
              };
              this.indexOf = function(searchValue, fromIndex) {
                if (fromIndex) {
                  return this.todo.indexOf(searchValue, fromIndex);
                } else {
                  return this.todo.indexOf(searchValue);
                }
              };
              this.substring = function(fromIndex, toIndex) {
                if (toIndex) {
                  return this.todo.substring(fromIndex, toIndex);
                } else {
                  return this.todo.substring(fromIndex);
                }
              };
              this.search = function(regex) {
                return this.todo.search(regex);
              };
            },
            snatch = new Snatch(trim(str)),
            result;


          if (ltrim(str).substr(0, 1) === '[') {
            result = {
              html: parseArray(snatch).toString(),
              valid: !hasError
            };
          } else {
            if (ltrim(str).substr(0, 1) === '{') {
              result = {
                html: parseObject(snatch).toString(),
                valid: !hasError
              };
            } else {
              result = {
                html: snatch.err("JSON expression must be an object or an array", str).update(null, '').toString(),
                valid: false
              };
            }
          }
          console.log(result);
          return result;
        }

        // Analyze the JSON String before Parsing
        function analyze(jsonString) {
          function trim(s) {
            var whitespace = "[\\x20\\t\\r\\n\\f]",
              rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g");
            return s.replace(rtrim, '');
          }

          if (trim(jsonString) === '') {
            $result.innerHTML = '';
            return;
          }

          jsonString = jsonString.replace(/</g, '&lt;');
          jsonString = jsonString.replace(/>/g, '&gt;');
          var result = parse(jsonString);
          $result.innerHTML = result.html;

          if (!service.handlersCreated) {
            createEventHandlers();
            service.handlersCreated = true;
          }
        }

        return analyze(service.jsonString);
      }
  }
})();

(function() {
  "use strict";

  angular
    .module('jv.json-viewer')
    .directive('jvJsonViewer', jsonViewer);

  jsonViewer.$inject = ['$templateCache', 'jsonViewerService'];

  function jsonViewer($templateCache, jsonViewerService) {
    var directive = {
      restrict: 'E',
      template: $templateCache.get('jsonViewer/jsonViewer.tpl.html'),
      scope: {
        editor: '=',
        data: '='
      },
      link: linkFunc,
    };

    return directive;

    function linkFunc(scope, el, attr) { // jshint ignore:line

      scope.analyzeJson = function() {
        if(scope.editor)
          jsonViewerService.jsonString = scope.editorText;
        else if(scope.data) {
          if(angular.isString(scope.data)) {
            scope.editorText = scope.data;
            jsonViewerService.jsonString = scope.data;
          } else {
            scope.editorText = angular.toJson(scope.data, false);
            jsonViewerService.jsonString = angular.toJson(scope.data, false);
          }
        }
        jsonViewerService.parseJson();
      };

    }

  }
})();

angular.module("jv.json-viewer").run(["$templateCache", function($templateCache) {$templateCache.put("jsonViewer/jsonViewer.tpl.html","<div id=\"main\" class=\"beautify\">\n  <div class=\"ui-editor\" ng-show=\"editor\">\n    <textarea class=\"ui-field json\" id=\"editor\" ng-model=\"editorText\" ng-change=\"analyzeJson()\" spellcheck=\"false\" contenteditable=\"true\"></textarea>\n    <div class=\"ui-resizer\"></div>\n  </div>\n  <div class=\"ui-aside\">\n    <div class=\"ui-notification\" id=\"status\"><b>Invalid JSON</b> &nbsp; 1&nbsp;error&nbsp;found</div>\n    <div class=\"ui-menu\">\n      <div class=\"ui-menu-dropdown\">\n        <div class=\"ui-menu-panel\">\n          <div class=\"ui-menu-item ui-option\" id=\"beautify\">Beautify</div>\n          <div class=\"ui-menu-item ui-option\" id=\"show-types\">Show Types</div>\n          <div class=\"ui-menu-item ui-option\" id=\"show-indexes\">Show Indexes</div>\n          <div class=\"ui-menu-item about\" style=\"display:none\">About</div>\n        </div>\n      </div>\n    </div>\n    <div class=\"ui-treeview json\" id=\"result\">\n    </div>\n  </div>\n</div>\n");}]);