def is_nested(string):
    '''
    Create a function that takes a string as input which contains only square brackets.
    The function should return True if and only if there is a valid subsequence of brackets 
    where at least one bracket in the subsequence is nested.

    is_nested('[[]]') ➞ True
    is_nested('[]]]]]]][[[[[]') ➞ False
    is_nested('[][]') ➞ False
    is_nested('[]') ➞ False
    is_nested('[[][]]') ➞ True
    is_nested('[[]][[') ➞ True
    '''
    balance = 0

    for bracket in string:
        if bracket == '[':
            balance += 1
        elif bracket == ']':
            balance -= 1

        # More than one unmatched opening bracket means that one opening
        # bracket is nested inside another.
        if balance > 1:
            return True

    return False
