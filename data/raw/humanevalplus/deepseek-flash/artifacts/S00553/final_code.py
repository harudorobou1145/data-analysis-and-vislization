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
    # A nested balanced subsequence can always be reduced to "[[]]".
    # Find that pattern as a subsequence, one character at a time.
    target = '[[]]'
    target_index = 0

    for bracket in string:
        if bracket == target[target_index]:
            target_index += 1
            if target_index == len(target):
                return True

    return False
