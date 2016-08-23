class ClassList {
    constructor(uni, term) {

        this.baseURL = "http://api.schedulestorm.com:5000/v1/";
        this.detailKeys = ["prereq", "coreq", "antireq", "notes"];
        this.uni = uni;
        this.term = term;
        window.term = term;
        window.uni = uni;

        // we want to save the term and uni in localstorage
        localStorage.setItem('uni', uni);
        localStorage.setItem('term', term);

        this.location = location;
        this.searchFound = []; // Array that sorts search results by order of importance

        $("#searchcourses").unbind(); // unbind search if there is a bind

        this.createTermDropdown();
        this.getClasses();
    }


    /*
        Populates the term selector dropdown beside the search bar
    */
    createTermDropdown() {
        var self = this;

        $("#termselectdropdown").empty();

        // set our current term
        $("#termselect").html(window.unis[this.uni]["terms"][this.term] + ' <img src="assets/arrow.png">');

        // populate the terms
        for (var term in window.unis[this.uni]["terms"]) {
            var html = $('<li><a term="' + term + '">' + window.unis[this.uni]["terms"][term] + '</a></li>');

            html.click(function () {
                // check if they changed terms
                var newterm = $(this).find("a").attr("term");
                if (newterm != self.term) {
                    // This is a new term, reinstantiate the object so we can show the new results
                    window.classList = new ClassList(self.uni, newterm);
                }
            })

            $("#termselectdropdown").append(html);
        }

    }

    /*
        Retrieves the class list and populates the classes accordion
    */
    getClasses() {
        var self = this;

        $("#classdata").fadeOut(function () {
            $("#classdata").empty();

            // Remove any current loading animations for courses
            $("#courseSelector").find("#loading").remove();

            // Add loading animation
            var loading = new Loading($("#courseSelector"), "Loading Course Data...");

            // Get the class data
            $.getJSON(self.baseURL + "unis/" + self.uni + "/" + self.term + "/all", function(data) {
                self.classdata = data["classes"];
                self.rmpdata = data["rmp"];
                
                loading.remove(function () {
                    // We want to make sure the user hasn't chosen a new term while this one was loading
                    if (self.uni == window.uni && self.term == window.term) {
                        // In case the user spammed different terms while loading
                        $("#classdata").empty();

                        // Remove the loading animation and populate the list
                        self.populateClassList([data["classes"]], $("#classdata"), "");
                        self.bindSearch();
                    }
                });
                
            });
        });
    }

    generateClassDesc(desc) {
        var html = '<div class="accordiondesc">';

        if (desc["aka"] != undefined) {
            html += "AKA: " + desc["aka"] + "<br>";
        }
        if (desc["desc"] != undefined) {
            html += desc["desc"] + "<br><br>";
        }

        if (desc["units"] != undefined) {
            html += desc["units"] + " units; ";

            if (desc["hours"] == undefined) {
                html += "<br>";   
            }
        }

        if (desc["hours"] != undefined) {
            html += desc["hours"] + "<br>";
        }

        return html;
    }

    /*
        Generates class details button
    */
    generateClassDetails(element, path) {
        var self = this;

        var button = $(this.generateAccordionHTML("Details", path + "\\description"));

        button.find("label").click(function () {
            self.bindButton(self.classdata, this, "detail");
        });

        element.append(button);
    }

    /*
        Populates class details
    */
    populateClassDetails(data, element) {
        var html = '<div class="accordiondesc accordiondetail">';

        var detailIndex = 0;
        for (var detail in this.detailKeys) {
            var detail = this.detailKeys[detail];

            if (data[detail] != undefined) {
                // Capitalize the first letter of the key
                var capitalDetail = detail.charAt(0).toUpperCase() + detail.slice(1);

                // Proper spacing
                if (detailIndex > 0) {
                    html += "<br><br>"
                }
                html += capitalDetail + ": " + data[detail];

                detailIndex += 1;
            }
        }
        element.append(html);

        element.slideDown();
    }


    /*
        Populates a list of given clases
    */
    generateClasses(data, element) {
        var html = "<div class='accordiontableparent'><table class='table accordiontable'><tbody>";
        for (var index = 0; index < data["classes"].length; index++) {
            html += "<tr>";
            var thisclass = data["classes"][index];

            var id = thisclass["type"] + "-" + thisclass["group"] + " (" + thisclass["id"] + ")";
            
            html += "<td style='width: 15%;'>" + id + "</td>";

            var teachers = "";
            for (var teacher in thisclass["teachers"]) {
                if (teacher > 0) {
                    teachers += "<br>";
                }
                teacher = thisclass["teachers"][teacher];

                // want to find RMP rating
                var rating = "";
                if (this.rmpdata[teacher] != undefined) {
                    rating = this.rmpdata[teacher]["rating"];
                }

                if (teacher != "Staff") {
                    teacher = ClassList.abbreviateName(teacher);
                }

                teachers += teacher;

                if (rating != "") {
                    teachers += " (" + rating + ")";
                }
            }

            html += "<td style='width: 20%;'>" + teachers + "</td>";

            html += "<td>" + thisclass["rooms"].join("<br>") + "</td>";

            html += "<td style='width: 30%;'>" + thisclass["times"].join("<br>") + "</td>";

            html += "<td style='width: 15%;'>" + thisclass["location"] + "</td>";

            html += "<td>" + thisclass["status"] + "</td>";

            html += "<td>" + '<button class="btn btn-default">&plus;</button>' + "</td>";

            html += "</tr>"
        }

        html += "</tbody></table></div>";

        element.append(html);
    }

    /*
        Abbreviates a given name
    */
    static abbreviateName(name) {
        // We abbreviate everything except the last name
        var fragments = name.split(" ");
        var abbreviated = "";

        for (var fragment in fragments) {
            // Only add spaces in between words
            if (fragment > 0) {
                abbreviated += " ";
            }

            if (fragment == (fragments.length-1)) {
                // keep the full name
                abbreviated += fragments[fragment];
            }
            else if (fragment == 0) {
                var word = fragments[fragment];

                abbreviated += word.charAt(0).toUpperCase() + ".";
            }
        }

        return abbreviated;
    }

    /*
        Populates a class
    */
    populateClass(data, element, path) {
        if (data["description"] != undefined) {
            element.append(this.generateClassDesc(data["description"]));

            // Does this class have more info we can put in a details button?
            var foundDetails = false;
            for (var detail in this.detailKeys) {
                detail = this.detailKeys[detail];

                if (data["description"][detail] != undefined) {
                    foundDetails = true;
                    break;
                }
            }

            if (foundDetails === true) {
                // We have data to make a dropdown for
                this.generateClassDetails(element, path);
            }

            // Populate the class list
            this.generateClasses(data, element);
        }
    }

    /*
        Populates the classlist on demand given the hierarchy
    */
    populateClassList(data, element, path) {
        var self = this;

        // Slide up the element
        element.slideUp(function () {
            for (var arrayelement in data) {
                // this array is sorted my order of importance of populating the elements
                var thisdata = data[arrayelement];

                if (thisdata != undefined) {
                    for (var val in thisdata) {
                        if (val == "classes") {
                            // This is a class, process it differently
                            self.populateClass(thisdata, element, path);
                        }
                        else if (val != "description") {
                            // Generate this new element, give it the path
                            var thispath = "";
                            if (thisdata[val]["path"] != undefined) {
                                thispath = thisdata[val]["path"];
                            }
                            else {
                                thispath = path + "\\" + val;
                            }

                            var name = val;
                            
                            if (thisdata[val]["description"] != undefined) {
                                if (thisdata[val]["description"]["name"] != undefined) {
                                    name += " - " + thisdata[val]["description"]["name"]
                                }
                            }

                            var thiselement = $(self.generateAccordionHTML(name, thispath));

                            if (thisdata[val]["classes"] != undefined) {
                                // this is a label for a course, allow the user to add the general course
                                var addbutton = $('<div class="addCourseButton">+</div>');

                                addbutton.click(function (event) {
                                    event.stopPropagation();
                                    console.log("User wants to add a course");
                                });

                                thiselement.find("label").append(addbutton)
                            }

                            thiselement.find("label").click(function (event) {
                                event.stopPropagation();
                                self.bindButton(self.classdata, this, "class");
                            });
                            element.append(thiselement);
                        }
                    }
                }
            }

            element.slideDown();
        });
    }

    /*
        Binds an accordion button
    */
    bindButton(classdata, button, type) {
        //console.log(classdata);
        //console.log(button);

        var self = this;
        // Onclick handler

        // do we need to close the element?
        if ($(button).attr("accordopen") == "true") {
            // Close the element
            $(button).attr("accordopen", "false");

            $(button).parent().find("ul").slideUp(function () {
                $(this).empty();
            });

        }
        else {
            // Open accordion
            var thispath = $(button).attr("path").split("\\");
            $(button).attr("accordopen", "true");

            // Element to populate
            var element = $(button).parent().find("ul");

            // want to find the data to populate
            var thisdata = classdata;
            for (var key in thispath) {
                if (key > 0) {
                    thisdata = thisdata[thispath[key]];
                }
            }
            
            // Populate the element
            if (type == "class") {
                self.populateClassList([thisdata], element, $(button).attr("path"));
            }
            else if (type == "detail") {
                self.populateClassDetails(thisdata, element);
            }
        }
    }

    /*
        Binds search
    */
    bindSearch() {
        // Custom search
        var self = this;

        $("#searchcourses").keyup(function (e) {

            var searchval = $("#searchcourses").val();
            if (e.keyCode == 13) {
                // they pressed enter
                self.searchFound = [];
                $("#classdata").slideUp(function () {
                    $("#classdata").empty();


                    if (searchval == "" || searchval == " ") {
                        // Just populate the faculties
                        self.populateClassList([self.classdata], $("#classdata"), "");
                    }
                    else {
                        // find and populate the results
                        self.findText(self.classdata, searchval.toLowerCase(), "", "", 0);

                        if (self.searchFound.length) {
                            // We found results
                            self.populateClassList(self.searchFound, $("#classdata"), "");
                        }
                        else {
                            $("#classdata").text("We couldn't find anything :(").slideDown();
                        }
                    }
                });

            }
        })
    }

    /*
        Returns a boolean as to whether the given class contains the specified text
    */
    findTextInClasses(data, text) {

        // Check each class for matches
        for (var key in data["classes"]) {
            var thisclass = data["classes"][key];

            for (var prop in thisclass) {

                // Check if an array
                if (thisclass[prop].constructor === Array) {
                    for (var newprop in thisclass[prop]) {
                        if (thisclass[prop][newprop].toString().toLowerCase().indexOf(text) > -1) {
                            return true;
                        }
                    }
                }
                else if (thisclass[prop].toString().toLowerCase().indexOf(text) > -1) {
                    return true;
                }
            }
        }

        // Check the description attributes
        for (var key in data["description"]) {
            var thisdesc = data["description"][key];

            if (thisdesc.toString().toLowerCase().indexOf(text) > -1) {
                return true;
            }
        }

        // Didn't find a match
        return false;
    }

    /*
        Properly adds a search result to the global dict
    */
    addSearchData(data, key, depth, path) {
        data = jQuery.extend({}, data);
        data["path"] = path;

        if (this.searchFound[depth] == undefined) {
            this.searchFound[depth] = {};
        }

        this.searchFound[depth][key] = data;
    }

    /*
        Populates the global searchFound obj with courses that match the specified text (recursive)
    */
    findText(data, text, path, prevkey, depth) {
        if (data["classes"] != undefined) {
            // we are parsing a class

            if (this.findTextInClasses(data, text)) {
                var splitpath = path.split("\\");
                var key = splitpath[splitpath.length-2] + " " + prevkey;

                this.addSearchData(data, key, depth, path);
            }
        }
        else {
            for (var key in data) {
                if (key != "description") {

                    var thispath = path + "\\" + key;

                    var searchkey = key;

                    // Add the subject to a course num if we can (231 = CPSC 231)
                    if (depth == 2) {
                        splitpath = thispath.split("\\");
                        searchkey = splitpath[splitpath.length-2] + " " + searchkey;
                    }

                    // Find the text
                    if (searchkey.toLowerCase().indexOf(text) > -1) {
                        // We found it in the key, add it
                        this.addSearchData(data[key], searchkey, depth, thispath);
                    }
                    else {
                        // check if it has a description, if so, check that
                        if (data[key]["description"] != undefined && data[key]["description"]["name"] != undefined) {
                            if (data[key]["description"]["name"].toLowerCase().indexOf(text) > -1) {
                                // We found the text in the description, add it to the found list
                                this.addSearchData(data[key], searchkey, depth, thispath);
                            }
                        }
                    }

                    var thisdata = data[key];
                    
                    // Recursively look at the children
                    this.findText(thisdata, text, thispath, key, depth+1);
                }
            }
        }
    }

    /*
        Generates the general accordian structure HTML given a value
    */
    generateAccordionHTML(value, path) {
        return '<li class="has-children"><label path="' + path +'" accordopen="false">' + value + '</label><ul></ul></li>';
    }
}